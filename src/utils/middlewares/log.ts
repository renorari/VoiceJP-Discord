/*
    express lo4js middleware
*/

import log4js from "log4js";
import type { Request, Response, NextFunction } from "express";

function cloudflareRealIp(req: Request): string {
    const cfConnectingIp = req.headers["cf-connecting-ip"];
    if (typeof cfConnectingIp === "string") {
        return cfConnectingIp;
    }
    return req.ip || "0.0.0.0";
}

export default function accessLogMiddleware(logger: log4js.Logger) {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();

        res.on("finish", () => {
            const ms = Date.now() - start;
            const ip = cloudflareRealIp(req);
            const ua = req.headers["user-agent"] || "-";
            const ref = req.headers["referer"] || "-";

            logger.info(
                `${ip} [${new Date().toISOString()}] "${req.method} ${req.originalUrl}" ${res.statusCode} "${ref}" "${ua}" ${ms}ms`
            );
        });

        next();
    };
}
