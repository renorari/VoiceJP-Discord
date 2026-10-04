// Better Auth (Discord login)

import { BASE_URL } from "#lib/config.ts";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import prisma from "#lib/prisma.ts";

// identify と email は標準で付くので、サーバー一覧のために guilds だけ足す
const DISCORD_SCOPES = ["guilds"];

const auth = betterAuth({
    "baseURL": BASE_URL,
    "database": prismaAdapter(prisma, { "provider": "postgresql" }),
    "socialProviders": {
        "discord": {
            "clientId": process.env.DISCORD_CLIENT_ID || "",
            "clientSecret": process.env.DISCORD_CLIENT_SECRET || "",
            "scope": DISCORD_SCOPES
        }
    }
});

export default auth;
