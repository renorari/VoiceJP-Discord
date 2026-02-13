/*
    VoiceJP Discord Bot Handler: Speech Recognition Command
*/

import {
    BaseGuildTextChannel, ChannelType, ChatInputCommandInteraction, Client, Colors, EmbedBuilder,
    GuildMember, MessageFlags
} from "discord.js";
import fs from "node:fs/promises";
import path from "node:path";
import * as prism from "prism-media";
import * as vosk from "vosk";

import {
    EndBehaviorType, entersState, VoiceConnection, VoiceConnectionStatus
} from "@discordjs/voice";

import i18n from "../../../i18n.ts";
import log from "../../../utils/logger.ts";
import FillSilenceStream from "../../utils/fill-silence.ts";
import { MemberRecognitionDataMap } from "../../utils/recognition.ts";

import type { VoiceBasedChannel, VoiceState } from "discord.js";
import type { Connections, RecognitionChannels } from "../../../types/index.d.ts";

const logger = log.getLogger();

const voskModelPath = process.env.VOSK_MODEL_PATH || path.join(process.cwd(), "vosk-model");
fs.stat(voskModelPath).catch(() => {
    logger.warn(i18n.__("internal.speechRecognition.voskModelMissing", voskModelPath));
});
const voskModel = new vosk.Model(voskModelPath);

async function addMember(member: GuildMember, members: MemberRecognitionDataMap, connection: VoiceConnection, channel: BaseGuildTextChannel | VoiceBasedChannel) {
    const username = member.displayName.length > 10 ? member.displayName.slice(0, 10) : member.displayName;
    const webhook = await (channel as BaseGuildTextChannel).createWebhook({
        "name": `${username} [VoiceJP]`,
        "avatar": member.user.displayAvatarURL({
            "extension": "png"
        }),
        "reason": i18n.__("public.speechRecognition.webhookReason")
    }).catch((error) => {
        logger.error(error);
        throw new Error(i18n.__("internal.speechRecognition.webhookCreateFailed", channel.id, error instanceof Error ? error.message : String(error)));
    });

    const opusStream = connection.receiver.subscribe(member.id, {
        "end": {
            "behavior": EndBehaviorType.Manual
        }
    });
    opusStream.on("error", logger.error);
    const decoder = new prism.opus.Decoder({
        "rate": 48000,
        "channels": 1,
        "frameSize": 960
    });
    const voice = opusStream
        .pipe(decoder)
        .pipe(new FillSilenceStream());

    const recognizer = new vosk.Recognizer({
        "model": voskModel,
        "sampleRate": 48000
    });

    voice.on("data", (chunk: Buffer) => {
        if (recognizer.acceptWaveform(chunk)) {
            const result = recognizer.result().text.replace(/ /g, "").replace(/。/g, "。\n").trim();
            if (result.length === 0) return;

            webhook.send({
                "content": result.slice(0, 1000) + (result.length > 1000 ? "…" : "")
            });
        }
    });

    members.set(member.id, {
        member,
        webhook,
        voice,
        opusStream,
        decoder,
        recognizer
    });
}

async function replyMessage(interaction: ChatInputCommandInteraction, members: MemberRecognitionDataMap) {
    const membersList = Array.from(members.values());

    interaction.editReply({
        "content": i18n.__("public.speechRecognition.enabled"),
        "embeds": [
            new EmbedBuilder()
                .setTitle(i18n.__("public.speechRecognition.activeMembers"))
                .setDescription(membersList.length === 0 ? i18n.__("public.speechRecognition.noActiveMembers") : membersList.map(m => `- <@${m.member.id}>`).join("\n"))
                .setColor(Colors.DarkBlue)
        ]
    }).catch(() => {
        interaction.followUp({
            "embeds": [
                new EmbedBuilder()
                    .setTitle(i18n.__("public.speechRecognition.activeMembers"))
                    .setDescription(membersList.length === 0 ? i18n.__("public.speechRecognition.noActiveMembers") : membersList.map(m => `- <@${m.member.id}>`).join("\n"))
                    .setColor(Colors.DarkBlue)
            ]
        });
    });
}

export default async function handleSpeechRecognitionCommand(client: Client, interaction: ChatInputCommandInteraction, connections: Connections, recognitionChannels: RecognitionChannels) {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({
            "content": i18n.__("public.speechRecognition.guildOnly"),
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    if (recognitionChannels.has(interaction.guildId)) {
        recognitionChannels.delete(interaction.guildId);
        await interaction.reply({
            "content": i18n.__("public.speechRecognition.disabled")
        });
        return;
    }

    if (!connections.has(interaction.guildId)) {
        await interaction.reply({
            "content": i18n.__(
                "public.speechRecognition.noVoiceChannel",
                `</join:${client.application?.commands.cache.find(cmd => cmd.name === "join")?.id}>`
            ),
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    const connection = connections.get(interaction.guildId)!;
    const channel = interaction.guild.channels.cache.get(connection.channelId) as VoiceBasedChannel;
    const recognitionMembers: Map<string, GuildMember> = new Map();
    channel.members.forEach(member => {
        if (member.user.bot) return;
        recognitionMembers.set(member.id, member);
    });

    if (recognitionMembers.size > 10) {
        await interaction.reply({
            "content": i18n.__("public.speechRecognition.memberLimit"),
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    if (interaction.channel?.type !== ChannelType.GuildText && interaction.channel?.type !== ChannelType.GuildVoice) {
        await interaction.reply({
            "content": i18n.__("public.speechRecognition.textChannelOnly"),
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    await interaction.deferReply();

    const webhooks = await interaction.channel.fetchWebhooks();
    await Promise.all(webhooks.map(async webhook => {
        if (webhook.name.endsWith("[VoiceJP]")) {
            await webhook.delete(i18n.__("public.speechRecognition.webhookDeleteReason"));
            webhooks.delete(webhook.id);
        }
    }));
    if ((webhooks.size + recognitionMembers.size) > 15) {
        await interaction.editReply({
            "content": i18n.__("public.speechRecognition.webhookLimit")
        });
        return;
    }

    await entersState(connection.connection, VoiceConnectionStatus.Ready, 20_000);

    const members = new MemberRecognitionDataMap();
    for (const [, member] of recognitionMembers.entries()) {
        await addMember(member, members, connection.connection, interaction.channel)
            .catch(() => {
                interaction.followUp({
                    "content": i18n.__("public.speechRecognition.memberStartFailed", `<@${member.id}>`)
                });
            });
    }

    recognitionChannels.set(interaction.guildId, {
        "guildId": interaction.guildId,
        "textChannelId": interaction.channel.id,
        "voiceChannelId": connection.channelId,
        "interaction": interaction,
        "members": members
    });

    await replyMessage(interaction, members);
}

export async function handleVoiceStateUpdateRecognition(oldState: VoiceState, newState: VoiceState, connections: Connections, recognitionChannels: RecognitionChannels) {
    if (!newState.guild.id) return;
    const recognitionChannel = recognitionChannels.get(newState.guild.id);
    if (!recognitionChannel) return;

    const memberId = newState.id;
    const members = recognitionChannel.members;

    if (oldState.channelId && !newState.channelId) {
        if (members.has(memberId)) {
            members.delete(memberId);
            await replyMessage(recognitionChannel.interaction, members);
        }
    } else if (newState.channelId === recognitionChannel.voiceChannelId) {
        if (!members.has(memberId) && newState.member) {
            const interaction = recognitionChannel.interaction;
            const webhooks = await (interaction.channel as BaseGuildTextChannel).fetchWebhooks();
            if (members.size > 10) {
                await interaction.followUp({
                    "content": i18n.__("public.speechRecognition.memberLimit"),
                    "flags": [MessageFlags.Ephemeral]
                });
                return;
            }
            if ((webhooks.size + 1) > 15) {
                await interaction.followUp({
                    "content": i18n.__("public.speechRecognition.webhookLimit")
                });
                return;
            }

            const connection = connections.get(newState.guild.id);
            const channel = newState.guild.channels.cache.get(recognitionChannel.voiceChannelId) as BaseGuildTextChannel;
            if (connection && channel?.isVoiceBased() && newState.member) {
                await addMember(newState.member, members, connection.connection, newState.guild.channels.cache.get(recognitionChannel.textChannelId) as BaseGuildTextChannel)
                    .catch(() => {
                        interaction.followUp({
                            "content": i18n.__("public.speechRecognition.memberStartFailed", `<@${memberId}>`)
                        });
                    });
                await replyMessage(interaction, members);
            }
        }
    }
}
