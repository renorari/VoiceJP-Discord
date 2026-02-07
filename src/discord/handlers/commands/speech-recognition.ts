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

import { EndBehaviorType, entersState, VoiceConnectionStatus } from "@discordjs/voice";

import log from "../../../utils/logger.ts";
import FillSilenceStream from "../../utils/fill-silence.ts";

import type { VoiceBasedChannel } from "discord.js";
import type { Connections, RecognitionChannels } from "../../../types/index.d.ts";

const logger = log.getLogger();

const voskModelPath = process.env.VOSK_MODEL_PATH || path.join(process.cwd(), "vosk-model");
fs.stat(voskModelPath).catch(() => {
    logger.warn(`Vosk model not found at path: ${voskModelPath}. Please set VOSK_MODEL_PATH environment variable if necessary.`);
});
const voskModel = new vosk.Model(voskModelPath);

export default async function handleSpeechRecognitionCommand(client: Client, interaction: ChatInputCommandInteraction, connections: Connections, recognitionChannels: RecognitionChannels) {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({
            "content": "このコマンドはサーバー内でのみ使用できます。",
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    if (recognitionChannels.has(interaction.guildId)) {
        recognitionChannels.delete(interaction.guildId);
        await interaction.reply({
            "content": "このサーバーの音声認識を無効にしました。"
        });
        return;
    }

    if (!connections.has(interaction.guildId)) {
        await interaction.reply({
            "content": `Botが参加しているボイスチャンネルがありません。先に </join:${client.application?.commands.cache.find(cmd => cmd.name === "join")?.id}> コマンドでボイスチャンネルに参加させてください。`,
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
            "content": "音声認識は最大10人まで対応しています。ボイスチャンネルの参加者を減らしてから再度実行してください。",
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    if (interaction.channel?.type !== ChannelType.GuildText) {
        await interaction.reply({
            "content": "このコマンドはテキストチャンネルで実行してください。",
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    await interaction.deferReply();

    const webhooks = await interaction.channel.fetchWebhooks();
    await Promise.all(webhooks.map(async webhook => {
        if (webhook.name.endsWith("[VoiceJP]")) {
            await webhook.delete("不要なVoiceJPのWebhookを削除");
            webhooks.delete(webhook.id);
        }
    }));
    if ((webhooks.size + recognitionMembers.size) > 10) {
        await interaction.editReply({
            "content": "テキストチャンネルのWebhookが上限に達しているため、音声認識を開始できません。不要なWebhookを削除してから再度実行してください。"
        });
        return;
    }

    await entersState(connection.connection, VoiceConnectionStatus.Ready, 20_000);

    const members = new Map();
    for (const [memberId, member] of recognitionMembers.entries()) {
        const username = member.displayName.length > 10 ? member.displayName.slice(0, 10) : member.displayName;
        const webhook = await (interaction.channel as BaseGuildTextChannel).createWebhook({
            "name": `${username} [VoiceJP]`,
            "avatar": member.user.displayAvatarURL({
                "extension": "png"
            }),
            "reason": "VoiceJPの音声認識用"
        });

        const opusStream = connection.connection.receiver.subscribe(member.id, {
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

        members.set(memberId, {
            member,
            webhook,
            voice,
            opusStream,
            decoder,
            recognizer
        });
    }

    recognitionChannels.set(interaction.guildId, {
        "guildId": interaction.guildId,
        "voiceChannelId": connection.channelId,
        "members": members
    });

    await interaction.editReply({
        "content": "音声認識を有効にしました。",
        "embeds": [
            new EmbedBuilder()
                .setTitle("参加中のメンバー")
                .setDescription(Array.from(members.values()).map(m => `- <@${m.member.id}>`).join("\n"))
                .setColor(Colors.DarkBlue)
        ]
    });
}