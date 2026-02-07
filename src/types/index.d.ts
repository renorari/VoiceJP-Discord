/*
    VoiceJP Discord Bot Types
*/

import { joinVoiceChannel, createAudioPlayer } from "@discordjs/voice";

export interface Connection {
    guildId: string;
    channelId: string;
    connection: ReturnType<typeof joinVoiceChannel>;
}

export interface SynthesisChannel {
    guildId: string;
    textChannelId: string;
    voiceChannelId: string;
    connection: ReturnType<typeof joinVoiceChannel>;
    player: ReturnType<typeof createAudioPlayer>;
}

export interface RecognitionChannel {
    guildId: string;
    voiceChannelId: string;
}

export type Connections = Map<string, Connection>;
export type SynthesisChannels = Map<string, SynthesisChannel>;
export type RecognitionChannels = Map<string, RecognitionChannel>;
