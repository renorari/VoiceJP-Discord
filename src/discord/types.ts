// VoiceJP Discord Types

import type { AudioPlayer, AudioReceiveStream, VoiceConnection } from "@discordjs/voice";
import type { ChatInputCommandInteraction, GuildMember, Webhook } from "discord.js";
import type ActiveRecording from "#recordings/recorder.ts";
import type { MemberRecognitionDataMap } from "./utils/recognition-maps.ts";

export interface Connection {
    guildId: string;
    channelId: string;
    connection: VoiceConnection;
}

export interface SynthesisChannel {
    guildId: string;
    textChannelId: string;
    voiceChannelId: string;
    connection: VoiceConnection;
    player: AudioPlayer;
}

export interface RecognitionMemberData {
    member: GuildMember;
    webhook: Webhook;
    opusStream: AudioReceiveStream;
    dispose: () => void;
}

export interface RecognitionChannel {
    guildId: string;
    textChannelId: string;
    voiceChannelId: string;
    interaction: ChatInputCommandInteraction;
    members: MemberRecognitionDataMap;
}

export interface State {
    connections: Map<string, Connection>;
    synthesisChannels: Map<string, SynthesisChannel>;
    recognitionChannels: Map<string, RecognitionChannel>;
    recordings: Map<string, ActiveRecording>;
}
