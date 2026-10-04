// VoiceJP Discord Constants

import {
    ChannelType, Colors, GatewayIntentBits, InteractionContextType, SlashCommandBuilder
} from "discord.js";

import type { ClientOptions } from "discord.js";

export const LOCALE = "ja-JP";
export const EMBED_COLOR = Colors.DarkBlue;

export const AUDIO_SAMPLE_RATE = 48000;
export const AUDIO_CHANNELS = 1;
export const AUDIO_FRAME_SIZE = 960;
export const AUDIO_BYTES_PER_SAMPLE = 2;

export const WEBHOOK_SUFFIX = "[VoiceJP]";
export const WEBHOOK_CREATE_REASON = "VoiceJPの音声認識用";
export const WEBHOOK_DELETE_REASON = "不要なVoiceJPのWebhookを削除";

export const clientOptions: ClientOptions = {
    "intents": [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.MessageContent
    ]
};

export const commands = [
    new SlashCommandBuilder()
        .setName("status")
        .setDescription("Botの現在情報を表示します。"),
    new SlashCommandBuilder()
        .setName("join")
        .setContexts(InteractionContextType.Guild)
        .setDescription("Botをボイスチャンネルに参加させます。")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("ボイスチャンネルを指定してBotを参加させます。")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        ),
    new SlashCommandBuilder()
        .setName("leave")
        .setContexts(InteractionContextType.Guild)
        .setDescription("Botをボイスチャンネルから退出させます。"),
    new SlashCommandBuilder()
        .setName("record")
        .setContexts(InteractionContextType.Guild)
        .setDescription("通話の録音と自動文字起こしを行います(月額プランの特典)。")
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription("録音を開始します。")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("stop")
                .setDescription("録音を終了して保存します。")
        ),
    new SlashCommandBuilder()
        .setName("speech")
        .setContexts(InteractionContextType.Guild)
        .setDescription("音声認識と音声合成の設定を行います。")
        .addSubcommand(subcommand =>
            subcommand
                .setName("synthesis")
                .setDescription("メッセージの読み上げを行います。")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("recognition")
                .setDescription("ボイスチャンネル内の音声を文字起こしします。")
        )
];
