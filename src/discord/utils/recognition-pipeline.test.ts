// Opus packets -> recognition pipeline (same code path as the Discord voice receiver)

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { after, test } from "node:test";
import { PassThrough } from "node:stream";
import * as prism from "prism-media";
import * as vosk from "vosk";

import synthesizeSpeech from "#utils/speech.ts";
import ensureVoskModel from "#utils/vosk-model.ts";
import { AUDIO_CHANNELS, AUDIO_FRAME_SIZE, AUDIO_SAMPLE_RATE } from "../constants/index.ts";
import createRecognitionPipeline from "./recognition-pipeline.ts";

const WAV_HEADER_SIZE = 44;
const BYTES_PER_SAMPLE = 2;
const FRAME_BYTES = AUDIO_FRAME_SIZE * BYTES_PER_SAMPLE * AUDIO_CHANNELS;
const TIMEOUT = 15_000;
const PHRASE = "今日はいい天気ですね";

const model = new vosk.Model(await ensureVoskModel());

after(() => model.free());

// Discord が送ってくるのと同じ、1 パケット 1 チャンクの Opus ストリームを作る
async function encodeOpus(pcm: Buffer) {
    const encoder = new prism.opus.Encoder({
        "rate": AUDIO_SAMPLE_RATE,
        "channels": AUDIO_CHANNELS,
        "frameSize": AUDIO_FRAME_SIZE
    });
    const packets: Buffer[] = [];
    encoder.on("data", (packet: Buffer) => packets.push(packet));

    for (let offset = 0; offset < pcm.length; offset += FRAME_BYTES) {
        encoder.write(pcm.subarray(offset, offset + FRAME_BYTES));
    }
    encoder.end();
    await new Promise(resolve => encoder.on("end", resolve));

    return packets;
}

test("Opus のパケットから文字起こしされる", async () => {
    const wav = await fs.readFile(await synthesizeSpeech(PHRASE));
    const packets = await encodeOpus(wav.subarray(WAV_HEADER_SIZE));
    assert.ok(packets.length > 0);

    // 本番の受信ストリームは (EndBehaviorType.Manual で) 終わらないので、パケットを流し込むだけで end しない
    const opusStream = new PassThrough({ "objectMode": true });
    const texts: string[] = [];
    const { decoder, voice, recognizer } = createRecognitionPipeline(opusStream, model, text => texts.push(text));
    packets.forEach(packet => opusStream.write(packet));

    // 発話が終わった後の無音で認識結果が確定するので、少し待つ
    const start = Date.now();
    while (texts.join("").replace(/\n/g, "") !== PHRASE && Date.now() - start < TIMEOUT) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    opusStream.destroy();
    decoder.destroy();
    voice.destroy();
    recognizer.free();

    console.log(`  ${PHRASE} -> ${texts.join("")}`);
    assert.equal(texts.join("").replace(/\n/g, ""), PHRASE);
});
