/*
    VoiceJP Discord Bot: Blocked User List
*/

import i18n from "../../i18n.ts";
import log from "../../utils/logger.ts";

interface UserEntry {
    userId: string;
    reason: string;
}

interface UserCollection {
    [key: string]: UserEntry;
}

const ENDPOINTS = {
    "nrUsers": "https://kana.renorari.net/api/v2/discord/nr_users",
    "nrGuilds": "https://kana.renorari.net/api/v2/discord/nr_guilds"
} as const;

const logger = log.getLogger("discord");
const DEFAULT_UPDATE_INTERVAL_MS = 1000 * 60 * 5;

function resolveUpdateIntervalMs() {
    const rawValue = process.env.BLOCKLIST_UPDATE_INTERVAL_MS;
    if (!rawValue) {
        return DEFAULT_UPDATE_INTERVAL_MS;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        logger.warn(i18n.__("internal.blocklist.invalidUpdateInterval", rawValue));
        return DEFAULT_UPDATE_INTERVAL_MS;
    }

    return parsed;
}

const UPDATE_INTERVAL_MS = resolveUpdateIntervalMs();

let nrUsers: UserCollection = {};
let nrGuilds: UserCollection = {};

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url} (${response.status})`);
    }
    return response.json() as Promise<T>;
}

async function blockedUserCollectionUpdate() {
    const results = await Promise.allSettled([
        fetchJson<UserCollection>(ENDPOINTS.nrUsers),
        fetchJson<UserCollection>(ENDPOINTS.nrGuilds)
    ]);

    const [nrUsersResult, nrGuildsResult] = results;

    if (nrUsersResult.status === "fulfilled") {
        nrUsers = nrUsersResult.value;
    } else {
        logger.error(nrUsersResult.reason);
    }

    if (nrGuildsResult.status === "fulfilled") {
        nrGuilds = nrGuildsResult.value;
    } else {
        logger.error(nrGuildsResult.reason);
    }
}

blockedUserCollectionUpdate();
setInterval(blockedUserCollectionUpdate, UPDATE_INTERVAL_MS);

function nrCheck(id: string) {
    return (
        id in nrUsers ||
        id in nrGuilds
    );
}

export default nrCheck;
