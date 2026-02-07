/*
    VoiceJP Discord Bot Handler: Ping Command
*/

import { Client, Colors, CommandInteraction, EmbedBuilder } from "discord.js";

import type { Connections, RecognitionChannels, SynthesisChannels } from "../../../types/index.d.ts";

export default async function handlePingCommand(client: Client, interaction: CommandInteraction, connections: Connections, synthesisChannels: SynthesisChannels, recognitionChannels: RecognitionChannels) {
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
                .addFields({
                    "name": "参加中のサーバー数",
                    "value": `${client.guilds.cache.size} サーバー`,
                    "inline": true
                })
                .addFields({
                    "name": "参加中のボイスチャンネル数",
                    "value": `${connections.size} チャンネル`,
                    "inline": true
                })
                .addFields({
                    "name": "メッセージ読み上げ中のチャンネル数",
                    "value": `${synthesisChannels.size} チャンネル`,
                    "inline": true
                })
                .addFields({
                    "name": "音声認識中のチャンネル数・ユーザー数",
                    "value": `${recognitionChannels.size} チャンネル\n${Array.from(recognitionChannels.values()).reduce((acc, curr) => acc + curr.members.size, 0)} ユーザー`,
                    "inline": true
                })
                .setColor(Colors.DarkBlue)
                .setTimestamp()
        ]
    });
}
