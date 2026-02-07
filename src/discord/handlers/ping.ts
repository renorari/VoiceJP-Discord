/*
    VoiceJP Discord Bot Handler: Ping Command
*/

import { Client, Colors, CommandInteraction, EmbedBuilder } from "discord.js";

export default async function handlePingCommand(client: Client, interaction: CommandInteraction) {
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
}
