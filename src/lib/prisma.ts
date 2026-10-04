// Prisma client

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "#generated/prisma/client.ts";

const prisma = new PrismaClient({
    "adapter": new PrismaPg({ "connectionString": process.env.DATABASE_URL })
});

export default prisma;
