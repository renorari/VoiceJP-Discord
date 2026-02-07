/*
    VoiceJP Discord Bot
*/

import "dotenv/config";

import { ActivityType, Client, Colors, EmbedBuilder, Events, GatewayIntentBits, MessageFlags, SlashCommandBuilder } from "discord.js";

import log from "../utils/logger.ts";

const client = new Client({
    "intents": [
        GatewayIntentBits.Guilds
    ]
});
const logger = log.getLogger("discord");

function setActivity() {
    const guildsCount = client.guilds.cache.size;
    const channelsCount = 0; // Placeholder for joined voice channels count
    const latency = client.ws.ping;

    client.user?.setActivity(`/help | ${guildsCount}servers | joining ${channelsCount}channels | ${latency}ms`, { "type": ActivityType.Listening });
}

client.on(Events.ClientReady, readyClient => {
    logger.info(`Logged in as ${readyClient.user.tag}`);

    setActivity();
    setInterval(setActivity, 10 * 60 * 1000);

    readyClient.application.commands.set([
        new SlashCommandBuilder()
            .setName("ping")
            .setDescription("Botの現在情報を表示します。"),
        new SlashCommandBuilder()
            .setName("help")
            .setDescription("利用可能なコマンドの一覧を表示します。")
    ]);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
        case "ping": {
            await interaction.reply({
                "content": "ポン！",
                "embeds": [
                    new EmbedBuilder()
                        .setTitle("ステータス")
                        .addFields({
                            "name": "WebSocket遅延",
                            "value": `${client.ws.ping} ms`,
                            "inline": true
                        })
                        .addFields({
                            "name": "API遅延",
                            "value": `${Date.now() - interaction.createdTimestamp} ms`,
                            "inline": true
                        })
                        .addFields({
                            "name": "Botの稼働時間",
                            "value": `<t:${Math.floor(new Date(Date.now() - client.uptime!).getTime() / 1000)}:R>`
                        })
                        .setColor(Colors.DarkBlue)
                        .setTimestamp()
                ]
            });
            break;
        }

        default: {
            await interaction.reply({
                "content": "不明なコマンドです。\nDiscordの再起動をお試しください。",
                "flags": [MessageFlags.Ephemeral]
            });
            break;
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
