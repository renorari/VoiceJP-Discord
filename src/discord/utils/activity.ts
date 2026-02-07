/*
    VoiceJP Discord Bot Activity Setter
*/

import { ActivityType, Client } from "discord.js";

import type { Connections } from "../../types/index.d.ts";

export default function setActivity(client: Client, connections: Connections) {
    const guildsCount = client.guilds.cache.size;
    const channelsCount = connections.size;
    const latency = client.ws.ping;

    client.user?.setActivity(`/help | ${guildsCount}servers | joining ${channelsCount}channels | ${latency}ms`, { "type": ActivityType.Listening });
}
