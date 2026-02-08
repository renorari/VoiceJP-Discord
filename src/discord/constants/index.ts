/*
    VoiceJP Discord Bot Constants
*/

import { ChannelType, GatewayIntentBits, SlashCommandBuilder } from "discord.js";

import i18n from "../../i18n.ts";

import type { ClientOptions } from "discord.js";

export const clientOptions: ClientOptions = {
    "intents": [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.MessageContent
    ]
};

export const commands = [
    // Basic Commands
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription(i18n.__("public.commands.pingDescription")),
    new SlashCommandBuilder()
        .setName("help")
        .setDescription(i18n.__("public.commands.helpDescription")),
    // Join & Leave Command
    new SlashCommandBuilder()
        .setName("join")
        .setDescription(i18n.__("public.commands.joinDescription"))
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription(i18n.__("public.commands.joinChannelDescription"))
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        ),
    new SlashCommandBuilder()
        .setName("leave")
        .setDescription(i18n.__("public.commands.leaveDescription")),
    // Speech Commands
    new SlashCommandBuilder()
        .setName("speech")
        .setDescription(i18n.__("public.commands.speechDescription"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("synthesis")
                .setDescription(i18n.__("public.commands.speechSynthesisDescription"))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("recognition")
                .setDescription(i18n.__("public.commands.speechRecognitionDescription"))
        )
];
