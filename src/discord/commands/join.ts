// Join command

import { ChannelType } from "discord.js";

import { entersState, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";

import { replyEphemeral } from "../utils/reply.ts";
import closeSession from "../utils/session.ts";

import type { ChatInputCommandInteraction } from "discord.js";
import type { State } from "../types.ts";

const RECONNECT_TIMEOUT = 5_000;

export default async function handleJoinCommand(interaction: ChatInputCommandInteraction<"cached">, state: State) {
    const guildId = interaction.guildId;
    const channel = interaction.options.getChannel("channel", true);
    if (![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
        await replyEphemeral(interaction, "音声チャンネルを指定してください。");
        return;
    }

    await interaction.deferReply();

    const connection = joinVoiceChannel({
        "channelId": channel.id,
        guildId,
        "adapterCreator": interaction.guild.voiceAdapterCreator,
        "selfDeaf": false,
        "selfMute": false
    });

    connection.on(VoiceConnectionStatus.Ready, async () => {
        state.connections.set(guildId, { guildId, "channelId": channel.id, connection });
        await interaction.editReply({
            "content": `ボイスチャンネル <#${channel.id}> に参加しました。`
        });
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, RECONNECT_TIMEOUT),
                entersState(connection, VoiceConnectionStatus.Connecting, RECONNECT_TIMEOUT)
            ]);
        } catch {
            closeSession(guildId, state);
            connection.destroy();
            await interaction.followUp({
                "content": "ボイスチャンネルから切断されました。"
            });
        }
    });
}
