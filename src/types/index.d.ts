/*
    VoiceJP Discord Bot Types
*/

import { Recognizer, SpeakerRecognizerParam } from "vosk";

import { createAudioPlayer, joinVoiceChannel } from "@discordjs/voice";

import FillSilenceStream from "../discord/utils/fill-silence";

import type { AudioReceiveStream } from "@discordjs/voice";
import type { Transform } from "node:stream";
import type { GuildMember, Webhook } from "discord.js";

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
    members: Map<string, {
        member: GuildMember;
        webhook: Webhook;
        voice: FillSilenceStream;
        opusStream: AudioReceiveStream;
        decoder: Transform;
        recognizer: Recognizer<SpeakerRecognizerParam>;
    }>;
}

export type Connections = Map<string, Connection>;
export type SynthesisChannels = Map<string, SynthesisChannel>;
export type RecognitionChannels = Map<string, RecognitionChannel>;
