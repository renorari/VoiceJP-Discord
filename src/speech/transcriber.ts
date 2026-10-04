// Speech-to-text for one member: OpenAI (VoiceJP+) while chosen and credits last, Vosk otherwise

import { chargeTranscription, shouldUsePlus } from "#billing/usage.ts";
import log from "#lib/logger.ts";
import { transcribe } from "./openai.ts";
import createRecognitionPipeline from "./vosk-pipeline.ts";
import createUtterancePipeline from "./utterance-pipeline.ts";
import { getVoskModel } from "./vosk.ts";

import type { Readable } from "node:stream";

interface TranscriberOptions {
    guildId: string;
    memberId: string;
    onText: (text: string) => void;
    onExhausted?: () => void;
}

const logger = log.getLogger("discord");

function noop() {}

export default async function createTranscriber(opusStream: Readable, { guildId, memberId, onText, onExhausted }: TranscriberOptions) {
    let disposed = false;
    let dispose = noop;

    async function startFree() {
        const model = await getVoskModel();
        if (!disposed) ({ dispose } = createRecognitionPipeline(opusStream, model, onText));
    }

    // クレジットを使い切ったら、その場で無料のエンジンに切り替える
    async function switchToFree() {
        dispose();
        onExhausted?.();
        await startFree().catch(error => logger.error(error));
    }

    function startPaid() {
        ({ dispose } = createUtterancePipeline(opusStream, async (pcm, seconds) => {
            try {
                const text = await transcribe(pcm);
                if (text) onText(text);

                if (await chargeTranscription(guildId, seconds, memberId) && !disposed) await switchToFree();
            } catch (error) {
                logger.error(error);
            }
        }));
    }

    if (await shouldUsePlus(guildId, "recognition")) {
        startPaid();
    } else {
        await startFree();
    }

    return {
        "dispose": () => {
            disposed = true;
            dispose();
        }
    };
}
