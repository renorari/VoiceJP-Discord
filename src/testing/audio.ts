// Audio helpers shared by tests

import fs from "node:fs/promises";

import { AUDIO_BYTES_PER_SAMPLE, AUDIO_CHANNELS, AUDIO_FRAME_SIZE, createOpusEncoder } from "#speech/audio.ts";
import synthesizeSpeech from "#speech/open-jtalk.ts";

const WAV_HEADER_SIZE = 44;
const FRAME_BYTES = AUDIO_FRAME_SIZE * AUDIO_BYTES_PER_SAMPLE * AUDIO_CHANNELS;

// Open JTalk で合成した音声の PCM (48kHz / モノラル / 16bit)
export async function synthesizePcm(text: string) {
    const wav = await fs.readFile(await synthesizeSpeech(text));
    return wav.subarray(WAV_HEADER_SIZE);
}

// Discord が送ってくるのと同じ、1 パケット 1 チャンクの Opus パケットにする
export async function encodeOpus(pcm: Buffer) {
    const encoder = createOpusEncoder();
    const packets: Buffer[] = [];
    encoder.on("data", (packet: Buffer) => packets.push(packet));

    for (let offset = 0; offset < pcm.length; offset += FRAME_BYTES) {
        encoder.write(pcm.subarray(offset, offset + FRAME_BYTES));
    }
    encoder.end();
    await new Promise(resolve => encoder.on("end", resolve));

    return packets;
}
