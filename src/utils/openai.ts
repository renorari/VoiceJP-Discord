// OpenAI speech recognition and synthesis

import OpenAI, { toFile } from "openai";
import fs from "node:fs/promises";

import pcmToWav from "#utils/wav.ts";
import { createTempWavPath } from "#utils/speech.ts";

const LANGUAGE = "ja";
const TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";
const SPEECH_MODEL = process.env.OPENAI_SPEECH_MODEL || "tts-1";
const SPEECH_VOICE = process.env.OPENAI_SPEECH_VOICE || "alloy";

export const IS_OPENAI_CONFIGURED = Boolean(process.env.OPENAI_API_KEY);

// キーが未設定でも起動できるようにダミーを渡す (IS_OPENAI_CONFIGURED が false の間は呼ばれない)
const openai = new OpenAI({ "apiKey": process.env.OPENAI_API_KEY || "sk-not-configured" });

export async function transcribe(pcm: Buffer) {
    const result = await openai.audio.transcriptions.create({
        "file": await toFile(pcmToWav(pcm), "speech.wav", { "type": "audio/wav" }),
        "model": TRANSCRIPTION_MODEL,
        "language": LANGUAGE
    });

    return result.text.trim();
}

// Open JTalk の synthesizeSpeech と同じく、音声ファイルのパスを返す
export async function synthesizeSpeechWithOpenAI(text: string) {
    const response = await openai.audio.speech.create({
        "model": SPEECH_MODEL,
        "voice": SPEECH_VOICE,
        "input": text,
        "response_format": "wav"
    });

    const wavPath = createTempWavPath();
    await fs.writeFile(wavPath, Buffer.from(await response.arrayBuffer()));

    return wavPath;
}
