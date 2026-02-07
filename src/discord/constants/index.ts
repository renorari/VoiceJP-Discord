/*
    VoiceJP Discord Bot Constants
*/

import { ChannelType, GatewayIntentBits, SlashCommandBuilder } from "discord.js";

import type { ClientOptions } from "discord.js";

export const clientOptions: ClientOptions = {
    "intents": [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.MessageContent
    ]
};

export const commands = [
    // Basic Commands
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Botの現在情報を表示します。"),
    new SlashCommandBuilder()
        .setName("help")
        .setDescription("利用可能なコマンドの一覧を表示します。"),
    // Join & Leave Command
    new SlashCommandBuilder()
        .setName("join")
        .setDescription("Botをボイスチャンネルに参加させます。")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Botを参加させるボイスチャンネルを選択します。")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        ),
    new SlashCommandBuilder()
        .setName("leave")
        .setDescription("Botをボイスチャンネルから退出させます。")
];
