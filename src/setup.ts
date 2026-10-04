// VoiceJP Setup

import "dotenv/config";

import log from "#utils/logger.ts";
import ensureVoiceModel from "#utils/voice-model.ts";
import ensureVoskModel from "#utils/vosk-model.ts";

const logger = log.getLogger("setup");

const results = await Promise.allSettled([ensureVoiceModel(), ensureVoskModel()]);

// 失敗しても npm install は止めず、起動時にもう一度ダウンロードを試す
for (const result of results) {
    if (result.status === "rejected") {
        logger.warn(result.reason);
    }
}
