/*
    VoiceJP Discord Bot Handler: Speech Synthesis Command
*/

import { ChatInputCommandInteraction, Client, MessageFlags } from "discord.js";

import { createAudioPlayer } from "@discordjs/voice";

import i18n from "../../../i18n.ts";

import type { Connections, SynthesisChannels } from "../../../types/index.d.ts";

export default async function handleSpeechSynthesisCommand(client: Client, interaction: ChatInputCommandInteraction, connections: Connections, synthesisChannels: SynthesisChannels) {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({
            "content": i18n.__("public.speechSynthesis.guildOnly"),
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    if (synthesisChannels.has(interaction.guildId)) {
        synthesisChannels.delete(interaction.guildId);
        await interaction.reply({
            "content": i18n.__("public.speechSynthesis.disabled")
        });
        return;
    }

    if (!connections.has(interaction.guildId)) {
        await interaction.reply({
            "content": i18n.__(
                "public.speechSynthesis.noVoiceChannel",
                `</join:${client.application?.commands.cache.find(cmd => cmd.name === "join")?.id}>`
            ),
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
        "content": i18n.__("public.speechSynthesis.enabled")
    });
}
