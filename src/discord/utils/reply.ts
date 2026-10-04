// Shared reply helpers

import { MessageFlags } from "discord.js";

import type { ChatInputCommandInteraction, Client } from "discord.js";

export function replyEphemeral(interaction: ChatInputCommandInteraction, content: string) {
    return interaction.reply({ content, "flags": [MessageFlags.Ephemeral] });
}

export function replyNoVoiceChannel(client: Client, interaction: ChatInputCommandInteraction) {
    const joinId = client.application?.commands.cache.find(command => command.name === "join")?.id;
    return replyEphemeral(interaction, `Botが参加しているボイスチャンネルがありません。先に </join:${joinId}> コマンドでボイスチャンネルに参加させてください。`);
}
