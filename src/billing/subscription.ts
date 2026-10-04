// Subscriber check (recording is a subscriber benefit)

import { isDatabaseConfigured } from "#lib/config.ts";
import log from "#lib/logger.ts";
import prisma from "#lib/prisma.ts";
import { ACTIVE_SUBSCRIPTION_STATUSES } from "./constants.ts";

const logger = log.getLogger("billing");

export default async function isSubscribed(guildId: string) {
    if (!isDatabaseConfigured()) return false;

    try {
        const billing = await prisma.guildBilling.findUnique({ "where": { guildId } });
        return Boolean(billing?.subscriptionStatus && ACTIVE_SUBSCRIPTION_STATUSES.includes(billing.subscriptionStatus));
    } catch (error) {
        logger.error(error);
        return false;
    }
}
