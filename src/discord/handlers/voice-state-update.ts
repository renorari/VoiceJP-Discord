// Voice state update event

import closeSession from "../utils/session.ts";

import type { VoiceState } from "discord.js";
import type { State } from "../types.ts";

export default async function handleVoiceStateUpdate(newState: VoiceState, state: State) {
    const connection = state.connections.get(newState.guild.id);
    if (!connection) return;

    const voiceChannel = newState.guild.channels.cache.get(connection.channelId);
    if (!voiceChannel?.isVoiceBased()) return;

    if (voiceChannel.members.every(member => member.user.bot)) {
        closeSession(newState.guild.id, state);
    }
}
