// Recognition state containers that release resources on removal

import { WEBHOOK_DELETE_REASON } from "../constants/index.ts";

import type { RecognitionChannel, RecognitionMemberData } from "../types.ts";

function disposeMember(data: RecognitionMemberData) {
    data.opusStream.destroy();
    data.dispose();
    data.webhook.delete(WEBHOOK_DELETE_REASON).catch(() => {});
}

export class MemberRecognitionDataMap extends Map<string, RecognitionMemberData> {
    delete(key: string): boolean {
        const data = this.get(key);
        if (data) disposeMember(data);
        return super.delete(key);
    }

    clear(): void {
        for (const key of this.keys()) {
            this.delete(key);
        }
    }
}

export default class RecognitionChannelMap extends Map<string, RecognitionChannel> {
    delete(key: string): boolean {
        this.get(key)?.members.clear();
        return super.delete(key);
    }

    clear(): void {
        for (const key of this.keys()) {
            this.delete(key);
        }
    }
}
