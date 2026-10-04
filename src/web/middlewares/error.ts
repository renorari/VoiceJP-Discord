// Express error response middlewares

import type { Logger } from "log4js";
import type { NextFunction, Request, Response } from "express";

const MESSAGES: Record<number, [string, string]> = {
    400: ["Bad Request", "リクエストが正しくありません"],
    401: ["Unauthorized", "認証が必要です"],
    403: ["Forbidden", "アクセスが許可されていません"],
    404: ["Not Found", "見つかりませんでした"],
    405: ["Method Not Allowed", "許可されていないメソッドです"],
    413: ["Payload Too Large", "リクエストが大きすぎます"],
    429: ["Too Many Requests", "リクエストが多すぎます"],
    500: ["Internal Server Error", "サーバー内部でエラーが発生しました"]
};

export class HttpError extends Error {
    status: number;

    constructor(status: number, message?: string) {
        super(message ?? (MESSAGES[status] ?? MESSAGES[500])[0]);
        this.status = status;
    }
}

export function sendError(res: Response, status: number) {
    const [message, messageJa] = MESSAGES[status] ?? MESSAGES[500];
    res.status(status).json({ "status": "error", message, messageJa });
}

export function notFoundHandler(req: Request, res: Response) {
    sendError(res, 404);
}

export function errorHandler(logger: Logger) {
    return (error: unknown, req: Request, res: Response, next: NextFunction) => {
        if (res.headersSent) {
            next(error);
            return;
        }

        // body-parser など、status を持つエラーはそのステータスを使う
        const status = typeof error === "object" && error !== null && "status" in error
            && typeof error.status === "number" && error.status >= 400 && error.status < 600
            ? error.status
            : 500;

        if (status >= 500) {
            logger.error(`${req.method} ${req.originalUrl}`, error);
        }

        sendError(res, status);
    };
}
