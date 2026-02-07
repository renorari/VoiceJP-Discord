/*
    VoiceJP Discord Bot Activity Setter
*/

import { ActivityType, Client } from "discord.js";

export default function setActivity(client: Client) {
    const guildsCount = client.guilds.cache.size;
    const channelsCount = 0; // Placeholder for joined voice channels count
    const latency = client.ws.ping;

    client.user?.setActivity(`/help | ${guildsCount}servers | joining ${channelsCount}channels | ${latency}ms`, { "type": ActivityType.Listening });
}
