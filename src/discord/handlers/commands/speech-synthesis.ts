/*
    VoiceJP Discord Bot Handler: Speech Synthesis Command
*/

import { ChatInputCommandInteraction, Client, MessageFlags } from "discord.js";

import { createAudioPlayer } from "@discordjs/voice";

import type { Connections, SynthesisChannels } from "../../../types/index.d.ts";

export default async function handleSpeechSynthesisCommand(client: Client, interaction: ChatInputCommandInteraction, connections: Connections, synthesisChannels: SynthesisChannels) {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({
            "content": "このコマンドはサーバー内でのみ使用できます。",
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    if (synthesisChannels.has(interaction.guildId)) {
        synthesisChannels.delete(interaction.guildId);
        await interaction.reply({
            "content": "このサーバーのメッセージ読み上げを無効にしました。"
        });
        return;
    }

    if (!connections.has(interaction.guildId)) {
        await interaction.reply({
            "content": `Botが参加しているボイスチャンネルがありません。先に </join:${client.application?.commands.cache.find(cmd => cmd.name === "join")?.id}> コマンドでボイスチャンネルに参加させてください。`,
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    const connection = connections.get(interaction.guildId)!;
    const player = createAudioPlayer();

    connection.connection.subscribe(player);

    synthesisChannels.set(interaction.guildId, {
        "guildId": interaction.guildId,
        "textChannelId": interaction.channelId,
        "voiceChannelId": connection.channelId,
        "connection": connection.connection,
        player
    });

    await interaction.reply({
        "content": "音声合成を有効にしました。"
    });
}
