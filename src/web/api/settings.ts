// Engine settings API (per guild)

import express from "express";

import { getEngineSettings, isEngine, updateEngineSettings } from "../../billing/settings.ts";
import requireSession from "../middlewares/auth.ts";
import { HttpError } from "../middlewares/error.ts";
import requireGuildManager from "../middlewares/guild.ts";

import type { EngineSettings } from "../../billing/settings.ts";

const SETTING_KEYS = ["synthesisEngine", "recognitionEngine"] as const;

const router = express.Router();

router.use("/guilds/:guildId/settings", requireSession, requireGuildManager);

router.get("/guilds/:guildId/settings", async (req, res) => {
    res.json({ "status": "ok", ...await getEngineSettings(req.params.guildId) });
});

// 送られた項目だけを変える。1 つでも不正な値があれば何も変えない
router.put("/guilds/:guildId/settings", async (req, res) => {
    const changes: Partial<EngineSettings> = {};
    for (const key of SETTING_KEYS) {
        const value = req.body?.[key];
        if (value === undefined) continue;
        if (!isEngine(value)) throw new HttpError(400);
        changes[key] = value;
    }
    if (Object.keys(changes).length === 0) throw new HttpError(400);

    res.json({ "status": "ok", ...await updateEngineSettings(req.params.guildId, changes) });
});

export default router;
