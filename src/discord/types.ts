// VoiceJP Discord Types

import type { AudioPlayer, AudioReceiveStream, VoiceConnection } from "@discordjs/voice";
import type { ChatInputCommandInteraction, GuildMember, Webhook } from "discord.js";
import type { Transform } from "node:stream";
import type { Recognizer, SpeakerRecognizerParam } from "vosk";
import type FillSilenceStream from "./utils/fill-silence.ts";
import type { MemberRecognitionDataMap } from "./utils/recognition.ts";

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

export interface State {
    connections: Map<string, Connection>;
    synthesisChannels: Map<string, SynthesisChannel>;
    recognitionChannels: Map<string, RecognitionChannel>;
}
