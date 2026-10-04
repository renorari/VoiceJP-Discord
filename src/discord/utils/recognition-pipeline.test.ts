// Opus packets -> Vosk recognition pipeline (same code path as the Discord voice receiver)

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { PassThrough } from "node:stream";
import * as vosk from "vosk";

import { encodeOpus, synthesizePcm } from "#utils/audio-fixture.ts";
import ensureVoskModel from "#utils/vosk-model.ts";
import createRecognitionPipeline from "./recognition-pipeline.ts";

const TIMEOUT = 15_000;
const PHRASE = "今日はいい天気ですね";

const model = new vosk.Model(await ensureVoskModel());

after(() => model.free());

test("Opus のパケットから文字起こしされる", async () => {
    const packets = await encodeOpus(await synthesizePcm(PHRASE));
    assert.ok(packets.length > 0);

    // 本番の受信ストリームは (EndBehaviorType.Manual で) 終わらないので、パケットを流し込むだけで end しない
    const opusStream = new PassThrough({ "objectMode": true });
    const texts: string[] = [];
    const { dispose } = createRecognitionPipeline(opusStream, model, text => texts.push(text));
    packets.forEach(packet => opusStream.write(packet));

    // 発話が終わった後の無音で認識結果が確定するので、少し待つ
    const start = Date.now();
    while (texts.join("").replace(/\n/g, "") !== PHRASE && Date.now() - start < TIMEOUT) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    opusStream.destroy();
    dispose();

    console.log(`  ${PHRASE} -> ${texts.join("")}`);
    assert.equal(texts.join("").replace(/\n/g, ""), PHRASE);
});
