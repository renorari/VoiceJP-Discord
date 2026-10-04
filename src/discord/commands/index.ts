// Slash command definitions and routing

import {
    ChannelType, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder
} from "discord.js";

import { ENGINE_LABELS } from "../constants.ts";
import { replyEphemeral } from "../utils/reply.ts";
import handleEngineCommand from "./engine.ts";
import handleJoinCommand from "./join.ts";
import handleLeaveCommand from "./leave.ts";
import { handleRecordStartCommand, handleRecordStopCommand } from "./record.ts";
import handleSpeechRecognitionCommand from "./speech-recognition.ts";
import handleSpeechSynthesisCommand from "./speech-synthesis.ts";
import handleStatusCommand from "./status.ts";

import type { ChatInputCommandInteraction } from "discord.js";
import type { State } from "../types.ts";

const GUILD_ONLY_MESSAGE = "このコマンドはサーバー内でのみ使用できます。";
const ENGINE_CHOICES = [
    { "name": ENGINE_LABELS.FREE, "value": "FREE" },
    { "name": ENGINE_LABELS.PLUS, "value": "PLUS" }
];

type GuildCommandHandler = (interaction: ChatInputCommandInteraction<"cached">, state: State) => Promise<void>;

// サブコマンドは「コマンド名 サブコマンド名」で引く
const GUILD_COMMANDS: Record<string, GuildCommandHandler> = {
    "join": handleJoinCommand,
    "leave": handleLeaveCommand,
    "engine": handleEngineCommand,
    "record start": handleRecordStartCommand,
    "record stop": handleRecordStopCommand,
    "speech synthesis": handleSpeechSynthesisCommand,
    "speech recognition": handleSpeechRecognitionCommand
};

export const commandDefinitions = [
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
        .setName("engine")
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDescription("読み上げと文字起こしで使うエンジンを選びます。")
        .addStringOption(option =>
            option
                .setName("synthesis")
                .setDescription("読み上げのエンジン")
                .addChoices(...ENGINE_CHOICES)
        )
        .addStringOption(option =>
            option
                .setName("recognition")
                .setDescription("文字起こしのエンジン")
                .addChoices(...ENGINE_CHOICES)
        ),
    new SlashCommandBuilder()
        .setName("record")
        .setContexts(InteractionContextType.Guild)
        .setDescription("通話の録音と自動文字起こしを行います (VoiceJP+ 月額プランの特典)。")
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

export default async function handleCommand(interaction: ChatInputCommandInteraction, state: State) {
    // status だけはサーバーの外 (DM など) でも使える
    if (interaction.commandName === "status") {
        await handleStatusCommand(interaction, state);
        return;
    }

    if (!interaction.inCachedGuild()) {
        await replyEphemeral(interaction, GUILD_ONLY_MESSAGE);
        return;
    }

    const name = [interaction.commandName, interaction.options.getSubcommand(false)].join(" ").trim();
    await GUILD_COMMANDS[name]?.(interaction, state);
}
