/*
    VoiceJP Discord Bot Recognition Utilities
*/

import log from "../../utils/logger.ts";

import type { RecognitionChannel } from "../../types/index.d.ts";

const logger = log.getLogger();

type FreeableRecognizer = { free?: () => void };
type DestroyableStream = { destroy: () => void };

const safeDestroy = (value: unknown): void => {
    if (value && typeof (value as DestroyableStream).destroy === "function") {
        (value as DestroyableStream).destroy();
    }
};

const safeFree = (value: unknown): void => {
    if (value && typeof (value as FreeableRecognizer).free === "function") {
        (value as FreeableRecognizer).free?.();
    }
};

export async function cleanupRecognitionChannel(channel?: RecognitionChannel): Promise<void> {
    if (!channel) return;

    const deletions: Promise<unknown>[] = [];

    for (const { webhook, voice, recognizer, opusStream, decoder } of channel.members.values()) {
        safeDestroy(opusStream);
        safeDestroy(decoder);
        safeDestroy(voice);
        safeFree(recognizer);
        if (webhook) {
            deletions.push(webhook.delete("VoiceJP recognition cleanup").catch(() => undefined));
        }
    }

    if (deletions.length > 0) {
        await Promise.all(deletions);
    }
}

export default class RecognitionChannelMap extends Map<string, RecognitionChannel> {
    delete(key: string): boolean {
        const channel = this.get(key);
        if (channel) {
            void cleanupRecognitionChannel(channel).catch(error => {
                logger.warn(`guild: ${key} ${error instanceof Error ? error.message : String(error)}`);
            });
        }
        return super.delete(key);
    }

    clear(): void {
        for (const key of this.keys()) {
            this.delete(key);
        }
    }
}
