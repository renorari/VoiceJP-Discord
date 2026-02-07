/*
    Voice JP Discord Bot Handler: Leave Command
*/

import { ChatInputCommandInteraction, Client, MessageFlags } from "discord.js";

import { Connections } from "../../types";

export async function handleLeaveCommand(client: Client, interaction: ChatInputCommandInteraction, connections: Connections) {
    if (!interaction.guildId) {
        await interaction.reply({
            "content": "このコマンドはサーバー内でのみ使用できます。",
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    const connection = connections.get(interaction.guildId);
    if (connection) {
        connection.destroy();
        connections.delete(interaction.guildId);
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
