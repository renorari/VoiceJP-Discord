// Opus stream -> PCM -> speech recognition

import * as prism from "prism-media";
import * as vosk from "vosk";

import { AUDIO_CHANNELS, AUDIO_FRAME_SIZE, AUDIO_SAMPLE_RATE } from "../constants/index.ts";
import FillSilenceStream from "./fill-silence.ts";

import type { Readable } from "node:stream";

export default function createRecognitionPipeline(opusStream: Readable, model: vosk.Model, onText: (text: string) => void) {
    const decoder = new prism.opus.Decoder({
        "rate": AUDIO_SAMPLE_RATE,
        "channels": AUDIO_CHANNELS,
        "frameSize": AUDIO_FRAME_SIZE
    });
    const voice = opusStream
        .pipe(decoder)
        .pipe(new FillSilenceStream());

    const recognizer = new vosk.Recognizer({
        model,
        "sampleRate": AUDIO_SAMPLE_RATE
    });

    voice.on("data", (chunk: Buffer) => {
        if (!recognizer.acceptWaveform(chunk)) return;

        const text = recognizer.result().text.replace(/ /g, "").replace(/。/g, "。\n").trim();
        if (text.length > 0) onText(text);
    });

    return { decoder, voice, recognizer };
}
