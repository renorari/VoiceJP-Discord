/*
    VoiceJP Discord Bot Handler: Undefined Command
*/

import { Client, CommandInteraction, MessageFlags } from "discord.js";

import i18n from "../../../i18n.ts";

export default async function handleUndefinedCommand(client: Client, interaction: CommandInteraction) {
    await interaction.reply({
        "content": i18n.__("public.commands.unknown"),
        "flags": [MessageFlags.Ephemeral]
    });
}
