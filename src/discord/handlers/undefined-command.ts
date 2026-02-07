/*
    VoiceJP Discord Bot Handler: Undefined Command
*/

import { Client, CommandInteraction, MessageFlags } from "discord.js";

export default async function handleUndefinedCommand(client: Client, interaction: CommandInteraction) {
    await interaction.reply({
        "content": "不明なコマンドです。\nDiscordの再起動をお試しください。",
        "flags": [MessageFlags.Ephemeral]
    });
}
