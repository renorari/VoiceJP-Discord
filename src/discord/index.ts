/*
    VoiceJP Discord Bot
*/

import "dotenv/config";

import { Client, Events } from "discord.js";

import log from "../utils/logger.ts";
import { clientOptions, commands } from "./constants/index.ts";
import { handleJoinCommand } from "./handlers/join.ts";
import { handleLeaveCommand } from "./handlers/leave.ts";
import handlePingCommand from "./handlers/ping.ts";
import handleUndefinedCommand from "./handlers/undefined-command.ts";
import setActivity from "./utils/activity.ts";

import type { Connections } from "../types/index.d.ts";

const client = new Client(clientOptions);
const logger = log.getLogger("discord");
const connections: Connections = new Map();

client.on(Events.ClientReady, readyClient => {
    logger.info(`Logged in as ${readyClient.user.tag}`);

    setActivity(readyClient, connections);
    setInterval(() => setActivity(readyClient, connections), 10 * 60 * 1000);

    readyClient.application.commands.set(commands);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
        case "ping":
            await handlePingCommand(client, interaction, connections);
            break;

        case "join":
            await handleJoinCommand(client, interaction, connections);
            break;

        case "leave":
            await handleLeaveCommand(client, interaction, connections);
            break;

        default: await handleUndefinedCommand(client, interaction);
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
