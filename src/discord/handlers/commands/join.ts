/*
    VoiceJP Discord Bot Handler: Join Command
*/

import { ChannelType, ChatInputCommandInteraction, Client, MessageFlags } from "discord.js";

import { entersState, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";

import type { Connections } from "../../../types/index.d.ts";

export async function handleJoinCommand(client: Client, interaction: ChatInputCommandInteraction, connections: Connections) {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({
            "content": "このコマンドはサーバー内でのみ使用できます。",
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    const channel = interaction.options.getChannel("channel", true);
    if (!channel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
        await interaction.reply({
            "content": "音声チャンネルを指定してください。",
            "flags": [MessageFlags.Ephemeral]
        });
        return;
    }

    await interaction.deferReply();

    const connection = joinVoiceChannel({
        "channelId": channel.id,
        "guildId": interaction.guildId,
        "adapterCreator": interaction.guild.voiceAdapterCreator,
        "selfDeaf": false,
        "selfMute": false
    });

    connection.on(VoiceConnectionStatus.Ready, async () => {
        connections.set(interaction.guildId!, {
            "guildId": interaction.guildId!,
            "channelId": channel.id,
            "connection": connection
        });
        await interaction.editReply({
            "content": `ボイスチャンネル <#${channel.id}> に参加しました。`
        });
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
            ]);
        } catch {
            connection.destroy();
            connections.delete(interaction.guildId!);
            await interaction.followUp({
                "content": "ボイスチャンネルから切断されました。"
            });
        }
    });
}