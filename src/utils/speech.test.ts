// Speech synthesis -> speech recognition round trip

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { after, test } from "node:test";
import * as vosk from "vosk";

import { AUDIO_FRAME_SIZE, AUDIO_SAMPLE_RATE } from "../discord/constants/index.ts";
import synthesizeSpeech from "./speech.ts";
import ensureVoskModel from "./vosk-model.ts";

const WAV_HEADER_SIZE = 44;
const BYTES_PER_SAMPLE = 2;
const CHUNK_SIZE = AUDIO_FRAME_SIZE * BYTES_PER_SAMPLE;
const SILENCE_FRAMES = 50;
const PHRASES = ["ありがとうございます", "今日はいい天気ですね", "ボイスチャンネルに参加しました"];

const model = new vosk.Model(await ensureVoskModel());

// Bot の文字起こしと同じ流れで、チャンクごとに音声を渡して結果をつなげる
function recognize(pcm: Buffer) {
    const recognizer = new vosk.Recognizer({ model, "sampleRate": AUDIO_SAMPLE_RATE });
    const texts: string[] = [];
    const audio = Buffer.concat([pcm, Buffer.alloc(CHUNK_SIZE * SILENCE_FRAMES)]);

    for (let offset = 0; offset < audio.length; offset += CHUNK_SIZE) {
        if (recognizer.acceptWaveform(audio.subarray(offset, offset + CHUNK_SIZE))) {
            texts.push(recognizer.result().text);
        }
    }
    texts.push(recognizer.finalResult().text);
    recognizer.free();

    return texts.join("").replace(/ /g, "");
}

after(() => model.free());

for (const phrase of PHRASES) {
    test(`「${phrase}」を合成して文字起こしできる`, async () => {
        const wav = await fs.readFile(await synthesizeSpeech(phrase));
        assert.equal(wav.readUInt32LE(24), AUDIO_SAMPLE_RATE);
        assert.equal(wav.readUInt16LE(22), 1);

        const text = recognize(wav.subarray(WAV_HEADER_SIZE));
        console.log(`  ${phrase} -> ${text}`);
        assert.equal(text, phrase);
    });
}
