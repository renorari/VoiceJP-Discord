// Require a logged-in session

import { fromNodeHeaders } from "better-auth/node";

import auth from "../auth.ts";
import { HttpError } from "./error.ts";

import type { NextFunction, Request, Response } from "express";

export default async function requireSession(req: Request, res: Response, next: NextFunction) {
    const session = await auth.api.getSession({ "headers": fromNodeHeaders(req.headers) });
    if (!session) throw new HttpError(401);

    res.locals.session = session;
    next();
}
