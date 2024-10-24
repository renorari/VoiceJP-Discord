/* VoiceJP Blocked User */

import UserCollection from "../models/user_collection";

let nrUsers: UserCollection = {};
let nrGuilds: UserCollection = {};
let ugcMutedUsers: UserCollection = {};
let ugcMutedGuilds: UserCollection = {};
let takasumibotMuted: UserCollection = {};
async function blockedUserCollectionUpdate() {
    try {
        nrUsers = await fetch("https://kana.renorari.net/api/v2/discord/nr_users").then((response) => response.json());
        nrGuilds = await fetch("https://kana.renorari.net/api/v2/discord/nr_guilds").then((response) => response.json());
        ugcMutedUsers = await fetch("https://kana.renorari.net/api/v2/discord/muted_users").then((response) => response.json());
        ugcMutedGuilds = await fetch("https://kana.renorari.net/api/v2/discord/muted_guilds").then((response) => response.json());
        takasumibotMuted = {};
        fetch("https://api.takasumibot.com/v1/mute_user").then((response) => response.json()).then((json: { success: boolean; message: string | null; data: { id: string; reason: string; time: string; }[]; }) => {
            json.data.forEach((user) => {
                takasumibotMuted[user.id] = { userId: user.id, reason: user.reason };
            });
        });
    } catch (error) {
        console.error(error);
    }
}
blockedUserCollectionUpdate();
setInterval(blockedUserCollectionUpdate, 1000 * 60);


function nrCheck(id: string) {
    return Object.keys(nrUsers).includes(id) || Object.keys(nrGuilds).includes(id) || Object.keys(ugcMutedUsers).includes(id) || Object.keys(ugcMutedGuilds).includes(id) || Object.keys(takasumibotMuted).includes(id);
}

export default nrCheck;