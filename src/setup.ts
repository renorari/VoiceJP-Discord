// VoiceJP Setup

import "dotenv/config";

import log from "./lib/logger.ts";
import ensureVoiceModel from "./speech/models/open-jtalk.ts";
import ensureVoskModel from "./speech/models/vosk.ts";

const logger = log.getLogger("setup");

const results = await Promise.allSettled([ensureVoiceModel(), ensureVoskModel()]);

// 失敗しても npm install は止めず、起動時にもう一度ダウンロードを試す
for (const result of results) {
    if (result.status === "rejected") {
        logger.warn(result.reason);
    }
}
