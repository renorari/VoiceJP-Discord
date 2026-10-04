// Require the logged-in user to manage the guild in the URL

import { HttpError } from "./error.ts";
import { assertCanManageGuild } from "../utils/guilds.ts";

import type { NextFunction, Request, Response } from "express";

const SNOWFLAKE_PATTERN = /^\d{17,20}$/;

export default async function requireGuildManager(req: Request<{ guildId: string }>, res: Response, next: NextFunction) {
    if (!SNOWFLAKE_PATTERN.test(req.params.guildId)) throw new HttpError(400);

    await assertCanManageGuild(res.locals.session.user.id, req.headers, req.params.guildId);
    next();
}
