// Status command

import { EmbedBuilder } from "discord.js";

import { EMBED_COLOR, LOCALE } from "../../constants/index.ts";

import type { ChatInputCommandInteraction, Client } from "discord.js";
import type { State } from "../../types.ts";

function format(value: number) {
    return value.toLocaleString(LOCALE);
}

export default async function handleStatusCommand(client: Client, interaction: ChatInputCommandInteraction, state: State) {
    const recognitionMembers = Array.from(state.recognitionChannels.values()).reduce((total, channel) => total + channel.members.size, 0);

    await interaction.reply({
        "embeds": [
            new EmbedBuilder()
                .setTitle("ステータス")
                .addFields(
                    { "name": "WebSocket遅延", "value": `${client.ws.ping} ms`, "inline": true },
                    { "name": "API遅延", "value": `${Date.now() - interaction.createdTimestamp} ms`, "inline": true },
                    { "name": "Botの稼働時間", "value": `<t:${Math.floor((Date.now() - (client.uptime ?? 0)) / 1000)}:R>` },
                    { "name": "参加中のサーバー数", "value": `${format(client.guilds.cache.size)} サーバー`, "inline": true },
                    { "name": "参加中のボイスチャンネル数", "value": `${format(state.connections.size)} チャンネル`, "inline": true },
                    { "name": "メッセージ読み上げ中のチャンネル数", "value": `${format(state.synthesisChannels.size)} チャンネル`, "inline": true },
                    { "name": "音声認識中のチャンネル数・ユーザー数", "value": `${format(state.recognitionChannels.size)} チャンネル\n${format(recognitionMembers)} ユーザー`, "inline": true }
                )
                .setColor(EMBED_COLOR)
                .setTimestamp()
        ]
    });
}
