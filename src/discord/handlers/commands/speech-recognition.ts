// Speech recognition command

import { chargeTranscription, hasCredits } from "#billing/usage.ts";
import log from "#utils/logger.ts";
import { transcribe } from "#utils/openai.ts";
import ensureVoskModel from "#utils/vosk-model.ts";
import { ChannelType, EmbedBuilder, MessageFlags } from "discord.js";
import * as vosk from "vosk";

import { EndBehaviorType, entersState, VoiceConnectionStatus } from "@discordjs/voice";

import {
    EMBED_COLOR, WEBHOOK_CREATE_REASON, WEBHOOK_DELETE_REASON, WEBHOOK_SUFFIX
} from "../../constants/index.ts";
import { MemberRecognitionDataMap } from "../../utils/recognition.ts";
import createRecognitionPipeline from "../../utils/recognition-pipeline.ts";
import { replyEphemeral, replyNoVoiceChannel } from "../../utils/reply.ts";
import createUtterancePipeline from "../../utils/utterance-pipeline.ts";

import type { VoiceConnection } from "@discordjs/voice";
import type { ChatInputCommandInteraction, Client, GuildMember, TextChannel, VoiceChannel, VoiceState } from "discord.js";
import type { State } from "../../types.ts";

const MEMBER_LIMIT = 10;
const WEBHOOK_LIMIT = 15;
const NAME_LIMIT = 10;
const MESSAGE_LIMIT = 1000;
const READY_TIMEOUT = 20_000;
const MEMBER_LIMIT_MESSAGE = `音声認識は最大${MEMBER_LIMIT}人まで対応しています。ボイスチャンネルの参加者を減らしてから再度実行してください。`;
const WEBHOOK_LIMIT_MESSAGE = "テキストチャンネルのWebhookが上限に達しているため、音声認識を開始できません。不要なWebhookを削除してから再度実行してください。";

const CREDITS_EXHAUSTED_MESSAGE = "クレジットが無くなったため、無料の音声認識に切り替えます。クレジットを追加すると、次回の開始から高精度な音声認識が使えます。";

const logger = log.getLogger("discord");
const switchingGuilds = new Set<string>();

let voskModel: vosk.Model | undefined;

async function getVoskModel() {
    voskModel ??= new vosk.Model(await ensureVoskModel());
    return voskModel;
}

// 初回起動時はバックグラウンドでモデルをダウンロードしておく
ensureVoskModel().catch(error => logger.error(error));

// クレジットが残っていれば OpenAI、なければ Vosk で文字起こしする
async function addMember(member: GuildMember, members: MemberRecognitionDataMap, connection: VoiceConnection, channel: TextChannel | VoiceChannel, useFreeEngine = false) {
    const guildId = member.guild.id;
    const paid = !useFreeEngine && await hasCredits(guildId);
    const model = paid ? undefined : await getVoskModel();

    const webhook = await channel.createWebhook({
        "name": `${member.displayName.slice(0, NAME_LIMIT)} ${WEBHOOK_SUFFIX}`,
        "avatar": member.user.displayAvatarURL({ "extension": "png" }),
        "reason": WEBHOOK_CREATE_REASON
    });

    const opusStream = connection.receiver.subscribe(member.id, {
        "end": { "behavior": EndBehaviorType.Manual }
    });
    opusStream.on("error", error => logger.error(error));

    function send(text: string) {
        webhook.send({
            "content": text.slice(0, MESSAGE_LIMIT) + (text.length > MESSAGE_LIMIT ? "…" : "")
        }).catch(error => logger.error(error));
    }

    const { dispose } = model
        ? createRecognitionPipeline(opusStream, model, send)
        : createUtterancePipeline(opusStream, async (pcm, seconds) => {
            try {
                const text = await transcribe(pcm);
                if (text) send(text);

                if (await chargeTranscription(guildId, seconds, member.id)) {
                    await switchToFreeEngine(members, connection, channel);
                }
            } catch (error) {
                logger.error(error);
            }
        });

    members.set(member.id, { member, webhook, opusStream, dispose });
}

// クレジットを使い切ったら、参加中の全員を無料のエンジンに切り替える
async function switchToFreeEngine(members: MemberRecognitionDataMap, connection: VoiceConnection, channel: TextChannel | VoiceChannel) {
    const guildId = channel.guild.id;
    if (switchingGuilds.has(guildId)) return;
    switchingGuilds.add(guildId);

    try {
        const targets = Array.from(members.values()).map(data => data.member);
        targets.forEach(member => members.delete(member.id));

        await channel.send(CREDITS_EXHAUSTED_MESSAGE);
        for (const member of targets) {
            await addMember(member, members, connection, channel, true).catch(error => logger.error(error));
        }
    } finally {
        switchingGuilds.delete(guildId);
    }
}

async function replyMessage(interaction: ChatInputCommandInteraction, members: MemberRecognitionDataMap) {
    const embed = new EmbedBuilder()
        .setTitle("参加中のメンバー")
        .setDescription(members.size === 0 ? "音声認識中のメンバーはいません。" : Array.from(members.values()).map(data => `- <@${data.member.id}>`).join("\n"))
        .setColor(EMBED_COLOR);

    await interaction.editReply({
        "content": "音声認識を有効にしました。",
        "embeds": [embed]
    }).catch(() => interaction.followUp({ "embeds": [embed] }));
}

export default async function handleSpeechRecognitionCommand(client: Client, interaction: ChatInputCommandInteraction<"cached">, state: State) {
    const { guildId } = interaction;

    if (state.recognitionChannels.has(guildId)) {
        state.recognitionChannels.delete(guildId);
        await interaction.reply({
            "content": "このサーバーの音声認識を無効にしました。"
        });
        return;
    }

    const connection = state.connections.get(guildId);
    if (!connection) {
        await replyNoVoiceChannel(client, interaction);
        return;
    }

    const voiceChannel = interaction.guild.channels.cache.get(connection.channelId);
    const recognitionMembers = voiceChannel?.isVoiceBased()
        ? Array.from(voiceChannel.members.filter(member => !member.user.bot).values())
        : [];

    if (recognitionMembers.length > MEMBER_LIMIT) {
        await replyEphemeral(interaction, MEMBER_LIMIT_MESSAGE);
        return;
    }

    const textChannel = interaction.channel;
    if (textChannel?.type !== ChannelType.GuildText && textChannel?.type !== ChannelType.GuildVoice) {
        await replyEphemeral(interaction, "このコマンドはテキストチャンネルで実行してください。");
        return;
    }

    await interaction.deferReply();

    const webhooks = await textChannel.fetchWebhooks();
    await Promise.all(webhooks.map(async webhook => {
        if (webhook.name.endsWith(WEBHOOK_SUFFIX)) {
            await webhook.delete(WEBHOOK_DELETE_REASON);
            webhooks.delete(webhook.id);
        }
    }));
    if ((webhooks.size + recognitionMembers.length) > WEBHOOK_LIMIT) {
        await interaction.editReply({ "content": WEBHOOK_LIMIT_MESSAGE });
        return;
    }

    await entersState(connection.connection, VoiceConnectionStatus.Ready, READY_TIMEOUT);

    const members = new MemberRecognitionDataMap();
    for (const member of recognitionMembers) {
        await addMember(member, members, connection.connection, textChannel).catch(error => {
            logger.error(error);
            interaction.followUp({ "content": `<@${member.id}> さんの音声認識の開始に失敗しました。` });
        });
    }

    state.recognitionChannels.set(guildId, {
        guildId,
        "textChannelId": textChannel.id,
        "voiceChannelId": connection.channelId,
        interaction,
        members
    });

    await replyMessage(interaction, members);
}

export async function handleVoiceStateUpdateRecognition(oldState: VoiceState, newState: VoiceState, state: State) {
    const recognitionChannel = state.recognitionChannels.get(newState.guild.id);
    if (!recognitionChannel || newState.member?.user.bot) return;

    const { interaction, members, voiceChannelId } = recognitionChannel;
    const memberId = newState.id;

    if (oldState.channelId === voiceChannelId && newState.channelId !== voiceChannelId) {
        if (members.delete(memberId)) {
            await replyMessage(interaction, members);
        }
        return;
    }

    if (newState.channelId !== voiceChannelId || members.has(memberId) || !newState.member) return;

    if (members.size >= MEMBER_LIMIT) {
        await interaction.followUp({
            "content": MEMBER_LIMIT_MESSAGE,
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    const textChannel = newState.guild.channels.cache.get(recognitionChannel.textChannelId) as TextChannel | VoiceChannel;
    const webhooks = await textChannel.fetchWebhooks();
    if ((webhooks.size + 1) > WEBHOOK_LIMIT) {
        await interaction.followUp({ "content": WEBHOOK_LIMIT_MESSAGE });
        return;
    }

    const connection = state.connections.get(newState.guild.id);
    if (!connection) return;

    await addMember(newState.member, members, connection.connection, textChannel).catch(error => {
        logger.error(error);
        interaction.followUp({ "content": `<@${memberId}> さんの音声認識の開始に失敗しました。` });
    });
    await replyMessage(interaction, members);
}
