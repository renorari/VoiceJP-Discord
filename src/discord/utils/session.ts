// Tear down every per-guild voice state

import type { State } from "../types.ts";

export default function closeSession(guildId: string, state: State) {
    state.connections.get(guildId)?.connection.destroy();
    state.connections.delete(guildId);
    state.synthesisChannels.delete(guildId);
    state.recognitionChannels.delete(guildId);
}
