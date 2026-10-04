// Audio format shared by Discord voice, speech engines and recordings (48 kHz / mono / 16 bit)

import stream from "node:stream";
import * as prism from "prism-media";

import type { Readable } from "node:stream";

export const AUDIO_SAMPLE_RATE = 48000;
export const AUDIO_CHANNELS = 1;
export const AUDIO_FRAME_SIZE = 960;
export const AUDIO_BYTES_PER_SAMPLE = 2;

const OPUS_OPTIONS = { "rate": AUDIO_SAMPLE_RATE, "channels": AUDIO_CHANNELS, "frameSize": AUDIO_FRAME_SIZE };

export function createOpusDecoder() {
    return new prism.opus.Decoder(OPUS_OPTIONS);
}

export function createOpusEncoder() {
    return new prism.opus.Encoder(OPUS_OPTIONS);
}

// 受け取った PCM を 1 フレームずつ実時間で流し、何も来ないときは無音を流す
export class FillSilenceStream extends stream.Transform {
    current: Buffer[] = [];
    interval: NodeJS.Timeout;

    constructor(rate: number = AUDIO_SAMPLE_RATE, channels: number = AUDIO_CHANNELS, frameSize: number = AUDIO_FRAME_SIZE) {
        super();
        this.interval = setInterval(() => {
            this.push(this.current.shift() ?? Buffer.alloc(frameSize * AUDIO_BYTES_PER_SAMPLE * channels));
        }, 1000 / (rate / frameSize));
    }

    _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        this.current.push(chunk);
        callback();
    }

    _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
        clearInterval(this.interval);
        callback(error);
    }

    _read() { }
}

// 話していない間を無音で埋めて、実際の時間どおりに流れる PCM にする
export function decodeWithSilence(opusStream: Readable) {
    const decoder = createOpusDecoder();
    const pcm = opusStream.pipe(decoder).pipe(new FillSilenceStream());

    return { decoder, pcm };
}
