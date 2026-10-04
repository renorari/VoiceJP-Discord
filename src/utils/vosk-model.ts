// Vosk model downloader

import fs from "node:fs/promises";
import path from "node:path";

import log from "#utils/logger.ts";
import { downloadZip, exists, once } from "#utils/download.ts";

const MODEL_URL = process.env.VOSK_MODEL_URL || "https://alphacephei.com/vosk/models/vosk-model-ja-0.22.zip";
const MODEL_PATH = process.env.VOSK_MODEL_PATH || path.join(process.cwd(), "vosk-model");
const TEMP_PATH = `${MODEL_PATH}.tmp`;

const logger = log.getLogger("vosk");

const ensureVoskModel = once(async () => {
    if (await exists(MODEL_PATH)) return MODEL_PATH;

    logger.info(`Vosk model not found at path: ${MODEL_PATH}. Downloading from ${MODEL_URL}`);

    const extractPath = await downloadZip(MODEL_URL, TEMP_PATH);

    // zip の中身は 1 つのディレクトリなので、それをモデルのパスに移動する
    const [directory] = await fs.readdir(extractPath);
    await fs.rename(path.join(extractPath, directory), MODEL_PATH);
    await fs.rm(TEMP_PATH, { "recursive": true, "force": true });

    logger.info(`Vosk model installed at path: ${MODEL_PATH}`);
    return MODEL_PATH;
});

export default ensureVoskModel;
