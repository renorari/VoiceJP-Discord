/*
    VoiceJP Discord Bot Handler: Voice State Update Event
*/

import type { VoiceState } from "discord.js";
import type { Connections, SynthesisChannels, RecognitionChannels } from "../../types/index.d.ts";

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState, connections: Connections, synthesisChannels: SynthesisChannels, recognitionChannels: RecognitionChannels) {
    const connection = connections.get(newState.guild.id);
    if (!connection) return;

    const voiceChannel = newState.guild.channels.cache.get(connection.channelId);
    if (!voiceChannel?.isVoiceBased()) return;

    const nonBotMembers = voiceChannel.members.filter(member => !member.user.bot);
    if (nonBotMembers.size === 0) {
        connection.connection.destroy();
        connections.delete(newState.guild.id);
        synthesisChannels.delete(newState.guild.id);
        recognitionChannels.delete(newState.guild.id);
    }
}
