/*
    VoiceJP Speech Synthesis
*/

import cp from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import log from "./logger.ts";

const logger = log.getLogger();

const TEMP_DIR = path.join(os.tmpdir(), "voicejp", "speech");
await fs.mkdir(TEMP_DIR, { "recursive": true });

const dictionaries: Record<string, string> = {
    "darwin": "/opt/homebrew/Cellar/open-jtalk/1.11/dic",
    "linux": "/var/lib/mecab/dic/open-jtalk/naist-jdic"
};

const dictionaryPath = process.env.OPEN_JTALK_DICTIONARY_PATH || dictionaries[process.platform] || "";
fs.access(dictionaryPath).catch(() => {
    logger.warn(`Open JTalk dictionary not found at path: ${dictionaryPath}. Please set OPEN_JTALK_DICTIONARY_PATH environment variable if necessary.`);
});

const modelPath = process.env.OPEN_JTALK_VOICE_MODEL_PATH || path.join(process.cwd(), "voices", "default.htsvoice");
fs.access(modelPath).catch(() => {
    logger.warn(`Open JTalk voice model not found at path: ${modelPath}. Please set OPEN_JTALK_VOICE_MODEL_PATH environment variable if necessary.`);
});

export default function synthesizeSpeech(text: string) {
    const tempWavPath = path.join(TEMP_DIR, `speech_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.wav`);
    const args = [
        "-x", dictionaryPath,
        "-m", modelPath,
        "-ow", tempWavPath,
        "-r", "1.5"
    ];

    const openJTalk = cp.spawn("open_jtalk", args);

    openJTalk.stdin.write(text);
    openJTalk.stdin.end();

    return new Promise<string>((resolve, reject) => {
        openJTalk.on("error", err => {
            reject(new Error(`Failed to start Open JTalk process: ${err.message}`));
        });

        openJTalk.on("close", code => {
            if (code !== 0) {
                reject(new Error(`Open JTalk process exited with code ${code}`));
            } else {
                resolve(tempWavPath);
            }
        });
    });
}
