// Subscriber check (recording is a subscriber benefit)

import log from "#utils/logger.ts";
import prisma from "../db/prisma.ts";
import { ACTIVE_SUBSCRIPTION_STATUSES } from "./constants.ts";

const logger = log.getLogger("billing");

export default async function isSubscribed(guildId: string) {
    if (!process.env.DATABASE_URL) return false;

    try {
        const billing = await prisma.guildBilling.findUnique({ "where": { guildId } });
        return Boolean(billing?.subscriptionStatus && ACTIVE_SUBSCRIPTION_STATUSES.includes(billing.subscriptionStatus));
    } catch (error) {
        logger.error(error);
        return false;
    }
}
