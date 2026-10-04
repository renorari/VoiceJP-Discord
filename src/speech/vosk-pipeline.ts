// Opus stream -> PCM -> speech recognition

import * as vosk from "vosk";

import { AUDIO_SAMPLE_RATE, decodeWithSilence } from "./audio.ts";

import type { Readable } from "node:stream";

export default function createRecognitionPipeline(opusStream: Readable, model: vosk.Model, onText: (text: string) => void) {
    const { decoder, "pcm": voice } = decodeWithSilence(opusStream);

    const recognizer = new vosk.Recognizer({
        model,
        "sampleRate": AUDIO_SAMPLE_RATE
    });

    voice.on("data", (chunk: Buffer) => {
        if (!recognizer.acceptWaveform(chunk)) return;

        const text = recognizer.result().text.replace(/ /g, "").replace(/。/g, "。\n").trim();
        if (text.length > 0) onText(text);
    });

    return {
        "dispose": () => {
            decoder.destroy();
            voice.destroy();
            recognizer.free();
        }
    };
}
