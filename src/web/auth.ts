// Better Auth (Discord login)

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import prisma from "../db/prisma.ts";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const DISCORD_SCOPES = ["identify", "email", "guilds"];

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
