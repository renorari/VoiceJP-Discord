/*
    VoiceJP Discord Bot
*/

import "dotenv/config";

import { Client, Events } from "discord.js";

import i18n from "../i18n.ts";
import log from "../utils/logger.ts";
import { clientOptions, commands } from "./constants/index.ts";
import handleHelpCommand from "./handlers/commands/help.ts";
import { handleJoinCommand } from "./handlers/commands/join.ts";
import { handleLeaveCommand } from "./handlers/commands/leave.ts";
import handlePingCommand from "./handlers/commands/ping.ts";
import handleSpeechRecognitionCommand, {
    handleVoiceStateUpdateRecognition
} from "./handlers/commands/speech-recognition.ts";
import handleSpeechSynthesisCommand from "./handlers/commands/speech-synthesis.ts";
import handleUndefinedCommand from "./handlers/commands/undefined-command.ts";
import { handleMessageCreateEvent } from "./handlers/message.ts";
import { handleVoiceStateUpdate } from "./handlers/voice-state-update.ts";
import setActivity from "./utils/activity.ts";
import sendAdMessage from "./utils/ad.ts";
import nrCheck from "./utils/block-user.ts";
import RecognitionChannelMap from "./utils/recognition.ts";

import type { GuildTextBasedChannel } from "discord.js";
import type { Connections, RecognitionChannels, SynthesisChannels } from "../types/index.d.ts";

const client = new Client(clientOptions);
const logger = log.getLogger("discord");

const connections: Connections = new Map();
const synthesisChannels: SynthesisChannels = new Map();
const recognitionChannels: RecognitionChannels = new RecognitionChannelMap();

client.on(Events.ClientReady, readyClient => {
    logger.info(i18n.__("internal.discord.loggedInAs", readyClient.user.tag));

    setActivity(readyClient, connections);
    setInterval(() => setActivity(readyClient, connections), 60 * 1000);

    readyClient.application.commands.set(commands);
});

client.on(Events.InteractionCreate, async interaction => {
    if (nrCheck(interaction.user.id) || nrCheck(interaction.guildId || "")) return;
    if (!interaction.isChatInputCommand()) return;

    if (Math.random() < 0.2) sendAdMessage(interaction.channel as GuildTextBasedChannel).catch(() => {});

    switch (interaction.commandName) {
        case "ping":
            await handlePingCommand(client, interaction, connections, synthesisChannels, recognitionChannels);
            break;

        case "help":
            await handleHelpCommand(client, interaction);
            break;

        case "join":
            await handleJoinCommand(client, interaction, connections, synthesisChannels, recognitionChannels);
            break;

        case "leave":
            await handleLeaveCommand(client, interaction, connections, synthesisChannels, recognitionChannels);
            break;

        case "speech": {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case "synthesis":
                    await handleSpeechSynthesisCommand(client, interaction, connections, synthesisChannels);
                    break;

                case "recognition":
                    await handleSpeechRecognitionCommand(client, interaction, connections, recognitionChannels);
                    break;

                default:
                    await handleUndefinedCommand(client, interaction);
                    break;
            }

            break;
        }

        default: await handleUndefinedCommand(client, interaction);
    }
});

client.on(Events.MessageCreate, async message => {
    if (nrCheck(message.author.id) || nrCheck(message.guildId || "")) return;
    await handleMessageCreateEvent(client, message, synthesisChannels);
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (nrCheck(newState.id) || nrCheck(newState.guild.id)) return;
    if (oldState.channelId === newState.channelId) return;

    await handleVoiceStateUpdateRecognition(oldState, newState, connections, recognitionChannels);
    await handleVoiceStateUpdate(oldState, newState, connections, synthesisChannels, recognitionChannels);
});

client.login(process.env.DISCORD_BOT_TOKEN);
