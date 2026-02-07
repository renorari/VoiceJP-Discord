/*
    VoiceJP Discord Bot Types
*/

import { joinVoiceChannel } from "@discordjs/voice";

export type Connections = Map<string, ReturnType<typeof joinVoiceChannel>>;
