// Speech synthesis with Open JTalk

import log from "#utils/logger.ts";
import ensureVoiceModel from "#utils/voice-model.ts";
import cp from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const COMMAND = "open_jtalk";
const SPEECH_RATE = "1.5";
const TEMP_DIR = path.join(os.tmpdir(), "voicejp", "speech");
const DICTIONARIES: Record<string, string> = {
    "darwin": "/opt/homebrew/Cellar/open-jtalk/1.11/dic",
    "linux": "/var/lib/mecab/dic/open-jtalk/naist-jdic"
};
const DICTIONARY_PATH = process.env.OPEN_JTALK_DICTIONARY_PATH || DICTIONARIES[process.platform] || "";

const logger = log.getLogger("speech");

await fs.mkdir(TEMP_DIR, { "recursive": true });
fs.access(DICTIONARY_PATH).catch(() => {
    logger.warn(`Open JTalk dictionary not found at path: ${DICTIONARY_PATH}. Please set OPEN_JTALK_DICTIONARY_PATH environment variable if necessary.`);
});

// 初回起動時はバックグラウンドで音声モデルをダウンロードしておく
ensureVoiceModel().catch(error => logger.error(error));

export function createTempWavPath() {
    return path.join(TEMP_DIR, `speech_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.wav`);
}

export default async function synthesizeSpeech(text: string) {
    const modelPath = await ensureVoiceModel();
    const tempWavPath = createTempWavPath();
    const openJTalk = cp.spawn(COMMAND, [
        "-x", DICTIONARY_PATH,
        "-m", modelPath,
        "-ow", tempWavPath,
        "-r", SPEECH_RATE
    ]);

    return new Promise<string>((resolve, reject) => {
        openJTalk.on("error", error => {
            reject(new Error(`Failed to start Open JTalk process: ${error.message}`));
        });

        openJTalk.on("close", code => {
            if (code !== 0) {
                reject(new Error(`Open JTalk process exited with code ${code}`));
            } else {
                resolve(tempWavPath);
            }
        });

        openJTalk.stdin.on("error", () => {});
        openJTalk.stdin.end(text);
    });
}
