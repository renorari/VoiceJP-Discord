/*
    VoiceJP Discord Bot Filling Silence Utility
*/

import stream from "node:stream";

export default class FillSilenceStream extends stream.Transform {
    current: Buffer[];
    interval: NodeJS.Timeout;

    constructor(rate: number = 48000, channels: number = 1, frameSize: number = 960) {
        super();
        this.current = [];
        this.interval = setInterval(() => {
            if (this.current.length === 0) {
                this.push(Buffer.alloc(frameSize * 2 * channels));
            } else {
                this.push(this.current.shift());
            }
        }, 1000 / (rate / frameSize));
    }

    _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.current.push(chunk);
        callback();
    }

    _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
        clearInterval(this.interval);
        callback(error);
    }

    _read() { }
}
