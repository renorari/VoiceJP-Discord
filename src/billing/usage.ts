// Decide whether a guild can use the paid (OpenAI) engines and charge for usage

import log from "#utils/logger.ts";
import { IS_OPENAI_CONFIGURED } from "#utils/openai.ts";
import { consumeCredits, getBalance, speechCost, transcriptionCost } from "./credits.ts";

const IS_DATABASE_CONFIGURED = Boolean(process.env.DATABASE_URL);

const logger = log.getLogger("billing");

// 課金機能が未設定、またはDBに繋がらないときは、無料のエンジンを使う
export async function hasCredits(guildId: string) {
    if (!IS_OPENAI_CONFIGURED || !IS_DATABASE_CONFIGURED) return false;

    try {
        return await getBalance(guildId) > 0;
    } catch (error) {
        logger.error(error);
        return false;
    }
}

export async function chargeSpeech(guildId: string, characters: number) {
    await consumeCredits({ guildId, "amount": speechCost(characters), "type": "USAGE_SPEECH", "detail": { characters } });
}

// 使い切ったら true を返す
export async function chargeTranscription(guildId: string, seconds: number, memberId: string) {
    await consumeCredits({ guildId, "amount": transcriptionCost(seconds), "type": "USAGE_TRANSCRIPTION", "detail": { seconds, memberId } });

    return await getBalance(guildId) <= 0;
}
