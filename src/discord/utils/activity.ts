/*
    VoiceJP Discord Bot Activity Setter
*/

import { ActivityType, Client } from "discord.js";

import i18n from "../../i18n.ts";

import type { Connections } from "../../types/index.d.ts";

export default function setActivity(client: Client, connections: Connections) {
    const guildsCount = client.guilds.cache.size;
    const channelsCount = connections.size;
    const latency = client.ws.ping;

    client.user?.setActivity(
        i18n.__("public.activity.status", guildsCount.toLocaleString("ja-JP"), channelsCount.toLocaleString("ja-JP"), latency.toLocaleString("ja-JP")),
        { "type": ActivityType.Listening }
    );
}
