// Speech synthesis command

import { createAudioPlayer } from "@discordjs/voice";

import { replyNoVoiceChannel } from "../utils/reply.ts";

import type { ChatInputCommandInteraction } from "discord.js";
import type { State } from "../types.ts";

export default async function handleSpeechSynthesisCommand(interaction: ChatInputCommandInteraction<"cached">, state: State) {
    const { guildId } = interaction;

    if (state.synthesisChannels.has(guildId)) {
        state.synthesisChannels.delete(guildId);
        await interaction.reply({
            "content": "このサーバーのメッセージ読み上げを無効にしました。"
        });
        return;
    }

    const connection = state.connections.get(guildId);
    if (!connection) {
        await replyNoVoiceChannel(interaction);
        return;
    }

    const player = createAudioPlayer();
    connection.connection.subscribe(player);

    state.synthesisChannels.set(guildId, {
        guildId,
        "textChannelId": interaction.channelId,
        "voiceChannelId": connection.channelId,
        "connection": connection.connection,
        player
    });

    await interaction.reply({
        "content": "音声合成を有効にしました。"
    });
}
