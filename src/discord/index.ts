// VoiceJP Discord

import "dotenv/config";

import log from "#lib/logger.ts";
import { Client, Events } from "discord.js";

import handleCommand, { commandDefinitions } from "./commands/index.ts";
import { clientOptions } from "./constants.ts";
import handleMessageCreate from "./events/message-create.ts";
import handleVoiceStateUpdate from "./events/voice-state-update.ts";
import RecognitionChannelMap from "./utils/recognition-maps.ts";

import type { State } from "./types.ts";

const logger = log.getLogger("discord");

const client = new Client(clientOptions);

const state: State = {
    "connections": new Map(),
    "synthesisChannels": new Map(),
    "recognitionChannels": new RecognitionChannelMap(),
    "recordings": new Map()
};

client.on(Events.ClientReady, async (readyClient) => {
    logger.info(`Logged in as ${readyClient.user.tag}!`);

    await readyClient.application.commands.set(commandDefinitions);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    await handleCommand(interaction, state).catch(error => logger.error(error));
});

client.on(Events.MessageCreate, async (message) => {
    await handleMessageCreate(message, state).catch(error => logger.error(error));
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    await handleVoiceStateUpdate(oldState, newState, state).catch(error => logger.error(error));
});

client.login(process.env.DISCORD_BOT_TOKEN);
