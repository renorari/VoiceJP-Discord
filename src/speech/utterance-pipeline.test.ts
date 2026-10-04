// Opus packets -> utterances (OpenAI path)

import assert from "node:assert/strict";
import { test } from "node:test";
import { PassThrough } from "node:stream";

import { encodeOpus, synthesizePcm } from "#testing/audio.ts";
import createUtterancePipeline from "./utterance-pipeline.ts";

const WAIT_FOR_SILENCE = 1500;

async function collect(packets: Buffer[]) {
    const opusStream = new PassThrough({ "objectMode": true });
    const utterances: { pcm: Buffer; seconds: number }[] = [];
    const { dispose } = createUtterancePipeline(opusStream, (pcm, seconds) => utterances.push({ pcm, seconds }));

    packets.forEach(packet => opusStream.write(packet));
    await new Promise(resolve => setTimeout(resolve, WAIT_FOR_SILENCE));

    opusStream.destroy();
    dispose();

    return utterances;
}

test("話し終わって無音が続くと、1 つの発話としてまとめて渡される", async () => {
    const pcm = await synthesizePcm("今日はいい天気ですね");
    const utterances = await collect(await encodeOpus(pcm));

    assert.equal(utterances.length, 1);
    assert.ok(utterances[0].seconds > 1);
    assert.ok(Math.abs(utterances[0].pcm.length - pcm.length) < pcm.length * 0.1);
});

test("短すぎる音(クリックなど)は渡されない", async () => {
    const utterances = await collect((await encodeOpus(await synthesizePcm("あ"))).slice(0, 5));

    assert.equal(utterances.length, 0);
});
