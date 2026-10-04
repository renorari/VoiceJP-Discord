// Which engine a server wants for read-aloud and speech recognition

import { isDatabaseConfigured } from "#lib/config.ts";
import log from "#lib/logger.ts";
import prisma from "#lib/prisma.ts";

import type { SpeechEngine } from "#generated/prisma/client.ts";

export interface EngineSettings {
    synthesisEngine: SpeechEngine;
    recognitionEngine: SpeechEngine;
}

const CACHE_TTL = 30 * 1000;
const DEFAULT_SETTINGS: EngineSettings = { "synthesisEngine": "PLUS", "recognitionEngine": "PLUS" };

const logger = log.getLogger("billing");

// 読み上げのたびに DB を引かないよう、短い時間だけ覚えておく
const cache = new Map<string, { settings: EngineSettings; expiresAt: number }>();

export function isEngine(value: unknown): value is SpeechEngine {
    return value === "FREE" || value === "PLUS";
}

export async function getEngineSettings(guildId: string): Promise<EngineSettings> {
    const cached = cache.get(guildId);
    if (cached && cached.expiresAt > Date.now()) return cached.settings;

    if (!isDatabaseConfigured()) return DEFAULT_SETTINGS;

    try {
        const saved = await prisma.guildSettings.findUnique({ "where": { guildId } });
        const settings = saved ? { "synthesisEngine": saved.synthesisEngine, "recognitionEngine": saved.recognitionEngine } : DEFAULT_SETTINGS;
        cache.set(guildId, { settings, "expiresAt": Date.now() + CACHE_TTL });
        return settings;
    } catch (error) {
        logger.error(error);
        return DEFAULT_SETTINGS;
    }
}

export async function updateEngineSettings(guildId: string, changes: Partial<EngineSettings>) {
    const saved = await prisma.guildSettings.upsert({
        "where": { guildId },
        "create": { guildId, ...changes },
        "update": changes
    });
    cache.delete(guildId);

    return { "synthesisEngine": saved.synthesisEngine, "recognitionEngine": saved.recognitionEngine };
}
