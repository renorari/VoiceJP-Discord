// Security headers: strict for the dashboard and API, relaxed for the public website

import { IS_PRODUCTION } from "#lib/config.ts";
import helmet from "helmet";

import type { NextFunction, Request, Response } from "express";

const STRICT_PATHS = ["/dashboard", "/api", "/vendor"];

// ダッシュボードで Discord のアイコンを表示するため、画像は Discord の CDN も許可する
// Safari は localhost の http でも https への自動切り替えをするので、本番以外ではそれを外す
const strict = helmet({
    "contentSecurityPolicy": {
        "directives": {
            "img-src": ["'self'", "data:", "https://cdn.discordapp.com"],
            ...IS_PRODUCTION ? {} : { "upgrade-insecure-requests": null }
        }
    },
    "strictTransportSecurity": IS_PRODUCTION
});

// 紹介ページは Google アナリティクスや AdSense を読み込むので、CSP は付けない
const site = helmet({
    "contentSecurityPolicy": false,
    "strictTransportSecurity": IS_PRODUCTION
});

export default function securityHeaders(req: Request, res: Response, next: NextFunction) {
    const middleware = STRICT_PATHS.some(strictPath => req.path.startsWith(strictPath)) ? strict : site;
    middleware(req, res, next);
}
