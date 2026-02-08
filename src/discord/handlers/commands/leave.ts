/*
    Voice JP Discord Bot Handler: Leave Command
*/

import { ChatInputCommandInteraction, Client, MessageFlags } from "discord.js";

import i18n from "../../../i18n.ts";

import type { Connections, RecognitionChannels, SynthesisChannels } from "../../../types/index.d.ts";

export async function handleLeaveCommand(client: Client, interaction: ChatInputCommandInteraction, connections: Connections, synthesisChannels: SynthesisChannels, recognitionChannels: RecognitionChannels) {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({
            "content": i18n.__("public.leave.guildOnly"),
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
            "content": i18n.__("public.leave.left"),
            "flags": [MessageFlags.Ephemeral]
        });
    } else {
        await interaction.reply({
            "content": i18n.__("public.leave.notInVoice"),
            "flags": [MessageFlags.Ephemeral]
        });
    }
}
