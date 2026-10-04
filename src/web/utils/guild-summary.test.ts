// Guild list: paid servers first (requires TEST_DATABASE_URL)

import { skip } from "../../db/database-fixture.ts";

import assert from "node:assert/strict";
import { after, test } from "node:test";

const prefix = `test-${Date.now()}`;

const { default: prisma } = await import("../../db/prisma.ts");
const { default: summarizeGuilds } = await import("./guild-summary.ts");

after(async () => {
    if (skip) return;

    await prisma.guildBilling.deleteMany({ "where": { "guildId": { "startsWith": "test-" } } });
    await prisma.$disconnect();
});

function guild(id: string, name: string) {
    return { "id": `${prefix}-${id}`, name, "icon": null };
}

test("月額プラン加入中、クレジットあり、どちらもなし の順に並び、同じなら名前順", { skip }, async () => {
    await prisma.guildBilling.createMany({ "data": [
        { "guildId": `${prefix}-sub`, "credits": 0, "subscriptionStatus": "active", "subscriptionPlan": "standard" },
        { "guildId": `${prefix}-credits-b`, "credits": 50 },
        { "guildId": `${prefix}-credits-a`, "credits": 10 },
        { "guildId": `${prefix}-canceled`, "credits": 0, "subscriptionStatus": "canceled", "subscriptionPlan": "lite" }
    ] });

    const result = await summarizeGuilds([
        guild("none", "あ・何もない"),
        guild("canceled", "か・解約済み"),
        guild("credits-b", "さ・クレジットB"),
        guild("sub", "ん・加入中"),
        guild("credits-a", "さ・クレジットA")
    ]);

    assert.deepEqual(result.map(item => item.name), ["ん・加入中", "さ・クレジットA", "さ・クレジットB", "あ・何もない", "か・解約済み"]);
    assert.deepEqual(result[0].plus, { "subscribed": true, "plan": "standard", "credits": 0 });
    assert.deepEqual(result[1].plus, { "subscribed": false, "plan": null, "credits": 10 });
    // 解約済みのプランは、プランとしては扱わない
    assert.deepEqual(result[4].plus, { "subscribed": false, "plan": null, "credits": 0 });
});
