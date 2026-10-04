// Fill silence into a stream while no audio is being received

import stream from "node:stream";

import { AUDIO_BYTES_PER_SAMPLE, AUDIO_CHANNELS, AUDIO_FRAME_SIZE, AUDIO_SAMPLE_RATE } from "../constants/index.ts";

export default class FillSilenceStream extends stream.Transform {
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
