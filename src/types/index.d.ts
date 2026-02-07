/*
    VoiceJP Discord Bot Types
*/

import { Recognizer, SpeakerRecognizerParam } from "vosk";

import { createAudioPlayer, joinVoiceChannel } from "@discordjs/voice";

import FillSilenceStream from "../discord/utils/fill-silence";
import { MemberRecognitionDataMap } from "../discord/utils/recognition";

import type { AudioReceiveStream } from "@discordjs/voice";
import type { Transform } from "node:stream";
import type { ChatInputCommandInteraction, GuildMember, Webhook } from "discord.js";

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

export interface RecognitionMemberData {
    member: GuildMember;
    webhook: Webhook;
    voice: FillSilenceStream;
    opusStream: AudioReceiveStream;
    decoder: Transform;
    recognizer: Recognizer<SpeakerRecognizerParam>;
}

export interface RecognitionChannel {
    guildId: string;
    textChannelId: string;
    voiceChannelId: string;
    interaction: ChatInputCommandInteraction;
    members: MemberRecognitionDataMap;
}

export type Connections = Map<string, Connection>;
export type SynthesisChannels = Map<string, SynthesisChannel>;
export type RecognitionChannels = Map<string, RecognitionChannel>;
