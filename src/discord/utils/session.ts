// Tear down every per-guild voice state

import log from "#utils/logger.ts";

import type { State } from "../types.ts";

const logger = log.getLogger("recording");

// 録音中なら、保存まで行ってから止める (終わりを待たずに戻る)
export function stopRecording(guildId: string, state: State) {
    const recording = state.recordings.get(guildId);
    state.recordings.delete(guildId);

    return recording?.stop().catch(error => logger.error(error));
}

export default function closeSession(guildId: string, state: State) {
    stopRecording(guildId, state);
    state.connections.get(guildId)?.connection.destroy();
    state.connections.delete(guildId);
    state.synthesisChannels.delete(guildId);
    state.recognitionChannels.delete(guildId);
}
