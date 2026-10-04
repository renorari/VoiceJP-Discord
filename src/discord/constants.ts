// VoiceJP Discord constants

import { Colors, GatewayIntentBits } from "discord.js";

import type { ClientOptions } from "discord.js";

export const LOCALE = "ja-JP";
export const EMBED_COLOR = Colors.DarkBlue;

export const ENGINE_LABELS = { "FREE": "標準 (無料)", "PLUS": "VoiceJP+" } as const;

export const WEBHOOK_SUFFIX = "[VoiceJP]";
export const WEBHOOK_CREATE_REASON = "VoiceJPの音声認識用";
export const WEBHOOK_DELETE_REASON = "不要なVoiceJPのWebhookを削除";

export const clientOptions: ClientOptions = {
    "intents": [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.MessageContent
    ]
};
