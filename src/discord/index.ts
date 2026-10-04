// VoiceJP Discord

import "dotenv/config";

import log from "#utils/logger.ts";
import { Client, Events } from "discord.js";

import { clientOptions, commands } from "./constants/index.ts";
import handleEngineCommand from "./handlers/commands/engine.ts";
import handleJoinCommand from "./handlers/commands/join.ts";
import handleLeaveCommand from "./handlers/commands/leave.ts";
import { handleRecordStartCommand, handleRecordStopCommand, handleVoiceStateUpdateRecording } from "./handlers/commands/record.ts";
import handleSpeechRecognitionCommand, {
    handleVoiceStateUpdateRecognition
} from "./handlers/commands/speech-recognition.ts";
import handleSpeechSynthesisCommand from "./handlers/commands/speech-synthesis.ts";
import handleStatusCommand from "./handlers/commands/status.ts";
import handleMessageCreateEvent from "./handlers/message.ts";
import handleVoiceStateUpdate from "./handlers/voice-state-update.ts";
import RecognitionChannelMap from "./utils/recognition.ts";
import { replyEphemeral } from "./utils/reply.ts";

import type { ChatInputCommandInteraction } from "discord.js";
import type { State } from "./types.ts";

const GUILD_ONLY_MESSAGE = "このコマンドはサーバー内でのみ使用できます。";

const logger = log.getLogger("discord");

const client = new Client(clientOptions);

const state: State = {
    "connections": new Map(),
    "synthesisChannels": new Map(),
    "recognitionChannels": new RecognitionChannelMap(),
    "recordings": new Map()
};

const guildCommandHandlers: Record<string, (interaction: ChatInputCommandInteraction<"cached">) => Promise<void>> = {
    "join": interaction => handleJoinCommand(interaction, state),
    "leave": interaction => handleLeaveCommand(interaction, state),
    "engine": interaction => handleEngineCommand(interaction),
    "record start": interaction => handleRecordStartCommand(client, interaction, state),
    "record stop": interaction => handleRecordStopCommand(interaction, state),
    "speech synthesis": interaction => handleSpeechSynthesisCommand(client, interaction, state),
    "speech recognition": interaction => handleSpeechRecognitionCommand(client, interaction, state)
};

client.on(Events.ClientReady, async (readyClient) => {
    logger.info(`Logged in as ${readyClient.user.tag}!`);

    await readyClient.application.commands.set(commands);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
        if (interaction.commandName === "status") {
            await handleStatusCommand(client, interaction, state);
            return;
        }

        if (!interaction.inCachedGuild()) {
            await replyEphemeral(interaction, GUILD_ONLY_MESSAGE);
            return;
        }

        const commandName = [interaction.commandName, interaction.options.getSubcommand(false)].join(" ").trim();
        await guildCommandHandlers[commandName]?.(interaction);
    } catch (error) {
        logger.error(error);
    }
});

client.on(Events.MessageCreate, async (message) => {
    await handleMessageCreateEvent(message, state);
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (oldState.channelId === newState.channelId) return;

    try {
        await handleVoiceStateUpdateRecognition(oldState, newState, state);
        await handleVoiceStateUpdateRecording(oldState, newState, state);
        await handleVoiceStateUpdate(newState, state);
    } catch (error) {
        logger.error(error);
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
