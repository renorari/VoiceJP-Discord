// Voice state update event: keep recognition, recording and the connection in step with who is in the call

import { handleVoiceStateUpdateRecording } from "../commands/record.ts";
import { handleVoiceStateUpdateRecognition } from "../commands/speech-recognition.ts";
import closeSession from "../utils/session.ts";

import type { VoiceState } from "discord.js";
import type { State } from "../types.ts";

// 通話に Bot しか残っていなければ退出する
async function leaveWhenEmpty(newState: VoiceState, state: State) {
    const connection = state.connections.get(newState.guild.id);
    if (!connection) return;

    const voiceChannel = newState.guild.channels.cache.get(connection.channelId);
    if (!voiceChannel?.isVoiceBased()) return;

    if (voiceChannel.members.every(member => member.user.bot)) {
        closeSession(newState.guild.id, state);
    }
}

export default async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState, state: State) {
    // ミュートなど、チャンネルの出入り以外の変化は関係ない
    if (oldState.channelId === newState.channelId) return;

    await handleVoiceStateUpdateRecognition(oldState, newState, state);
    await handleVoiceStateUpdateRecording(oldState, newState, state);
    await leaveWhenEmpty(newState, state);
}
