// Decide whether a guild can use the paid (OpenAI) engines and charge for usage

import { isDatabaseConfigured } from "#lib/config.ts";
import log from "#lib/logger.ts";
import { IS_OPENAI_CONFIGURED } from "#speech/openai.ts";
import { consumeCredits, getBalance, speechCost, transcriptionCost } from "./credits.ts";
import { getEngineSettings } from "./settings.ts";

const logger = log.getLogger("billing");

// 課金機能が未設定、またはDBに繋がらないときは、無料のエンジンを使う
export async function hasCredits(guildId: string) {
    if (!IS_OPENAI_CONFIGURED || !isDatabaseConfigured()) return false;

    try {
        return await getBalance(guildId) > 0;
    } catch (error) {
        logger.error(error);
        return false;
    }
}

// VoiceJP+ を選んでいて、クレジットもあるときだけ有料のエンジンを使う
export async function shouldUsePlus(guildId: string, kind: "synthesis" | "recognition") {
    const settings = await getEngineSettings(guildId);
    const engine = kind === "synthesis" ? settings.synthesisEngine : settings.recognitionEngine;

    return engine === "PLUS" && await hasCredits(guildId);
}

export async function chargeSpeech(guildId: string, characters: number) {
    await consumeCredits({ guildId, "amount": speechCost(characters), "type": "USAGE_SPEECH", "detail": { characters } });
}

// 使い切ったら true を返す
export async function chargeTranscription(guildId: string, seconds: number, memberId: string) {
    await consumeCredits({ guildId, "amount": transcriptionCost(seconds), "type": "USAGE_TRANSCRIPTION", "detail": { seconds, memberId } });

    return await getBalance(guildId) <= 0;
}
