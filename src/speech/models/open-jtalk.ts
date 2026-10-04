// Open JTalk voice model downloader (MMDAgent_Example "Mei", CC BY 3.0)

import fs from "node:fs/promises";
import path from "node:path";

import log from "#lib/logger.ts";
import { downloadZip, exists, once } from "#lib/download.ts";

const MODEL_URL = process.env.OPEN_JTALK_VOICE_MODEL_URL || "https://sourceforge.net/projects/mmdagent/files/MMDAgent_Example/MMDAgent_Example-1.8/MMDAgent_Example-1.8.zip/download";
const MODEL_FILE = "MMDAgent_Example-1.8/Voice/mei/mei_normal.htsvoice";
const MODEL_PATH = process.env.OPEN_JTALK_VOICE_MODEL_PATH || path.join(process.cwd(), "voices", "default.htsvoice");
const TEMP_PATH = `${MODEL_PATH}.tmp`;

const logger = log.getLogger("voice");

const ensureVoiceModel = once(async () => {
    if (await exists(MODEL_PATH)) return MODEL_PATH;

    logger.info(`Open JTalk voice model not found at path: ${MODEL_PATH}. Downloading from ${MODEL_URL}`);

    const extractPath = await downloadZip(MODEL_URL, TEMP_PATH);

    await fs.mkdir(path.dirname(MODEL_PATH), { "recursive": true });
    await fs.rename(path.join(extractPath, MODEL_FILE), MODEL_PATH);
    await fs.rm(TEMP_PATH, { "recursive": true, "force": true });

    logger.info(`Open JTalk voice model installed at path: ${MODEL_PATH}`);
    return MODEL_PATH;
});

export default ensureVoiceModel;
