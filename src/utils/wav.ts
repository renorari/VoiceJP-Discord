// PCM -> WAV

import { AUDIO_CHANNELS, AUDIO_SAMPLE_RATE } from "../discord/constants/index.ts";

const WAV_HEADER_SIZE = 44;
const BITS_PER_SAMPLE = 16;
const FORMAT_PCM = 1;

export default function pcmToWav(pcm: Buffer, sampleRate: number = AUDIO_SAMPLE_RATE, channels: number = AUDIO_CHANNELS) {
    const blockAlign = channels * BITS_PER_SAMPLE / 8;
    const header = Buffer.alloc(WAV_HEADER_SIZE);

    header.write("RIFF", 0);
    header.writeUInt32LE(WAV_HEADER_SIZE - 8 + pcm.length, 4);
    header.write("WAVEfmt ", 8);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(FORMAT_PCM, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * blockAlign, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(BITS_PER_SAMPLE, 34);
    header.write("data", 36);
    header.writeUInt32LE(pcm.length, 40);

    return Buffer.concat([header, pcm]);
}
