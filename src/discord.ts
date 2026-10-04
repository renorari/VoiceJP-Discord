// VoiceJP Discord

import "dotenv/config";

import { Client, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const COMMANDS = [
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!")
];

const client = new Client({ "intents": [GatewayIntentBits.Guilds] });
const restClient = new REST({ "version": "10" }).setToken(TOKEN);

client.on(Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}!`);

    await restClient.put(
        Routes.applicationCommands(readyClient.user.id),
        { "body": COMMANDS.map((command) => command.toJSON()) }
    );
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
        await interaction.reply("Pong!");
    }
});

client.login(TOKEN);
