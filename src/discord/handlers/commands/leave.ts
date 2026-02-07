/*
    Voice JP Discord Bot Handler: Leave Command
*/

import { ChatInputCommandInteraction, Client, MessageFlags } from "discord.js";

import type { Connections, RecognitionChannels, SynthesisChannels } from "../../../types/index.d.ts";

export async function handleLeaveCommand(client: Client, interaction: ChatInputCommandInteraction, connections: Connections, synthesisChannels: SynthesisChannels, recognitionChannels: RecognitionChannels) {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({
            "content": "このコマンドはサーバー内でのみ使用できます。",
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    const connection = connections.get(interaction.guildId);
    if (connection) {
        connection.connection.destroy();
        connections.delete(interaction.guildId);
        synthesisChannels.delete(interaction.guildId);
        recognitionChannels.delete(interaction.guildId);
        await interaction.reply({
            "content": "ボイスチャンネルから退出しました。",
            "flags": [MessageFlags.Ephemeral]
        });
    } else {
        await interaction.reply({
            "content": "Botは現在どのボイスチャンネルにも参加していません。",
            "flags": [MessageFlags.Ephemeral]
        });
    }
}
