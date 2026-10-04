// Opus stream -> PCM -> one chunk per utterance (split by silence)

import { AUDIO_BYTES_PER_SAMPLE, AUDIO_CHANNELS, AUDIO_SAMPLE_RATE, createOpusDecoder } from "./audio.ts";

import type { Readable } from "node:stream";

const SILENCE_TIMEOUT = 800;
const MIN_UTTERANCE_SECONDS = 0.5;
const MAX_UTTERANCE_SECONDS = 30;
const BYTES_PER_SECOND = AUDIO_SAMPLE_RATE * AUDIO_CHANNELS * AUDIO_BYTES_PER_SAMPLE;

export default function createUtterancePipeline(opusStream: Readable, onUtterance: (pcm: Buffer, seconds: number) => void) {
    const decoder = createOpusDecoder();
    opusStream.pipe(decoder);

    let chunks: Buffer[] = [];
    let size = 0;
    let timer: NodeJS.Timeout | undefined;

    // Discord は話している間しかパケットを送らないので、途切れたら 1 つの発話とみなす
    function flush() {
        clearTimeout(timer);

        const pcm = Buffer.concat(chunks);
        chunks = [];
        size = 0;

        const seconds = pcm.length / BYTES_PER_SECOND;
        if (seconds >= MIN_UTTERANCE_SECONDS) onUtterance(pcm, seconds);
    }

    decoder.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        size += chunk.length;

        clearTimeout(timer);
        timer = setTimeout(flush, SILENCE_TIMEOUT);

        if (size >= BYTES_PER_SECOND * MAX_UTTERANCE_SECONDS) flush();
    });

    return {
        "dispose": () => {
            clearTimeout(timer);
            decoder.destroy();
        }
    };
}
