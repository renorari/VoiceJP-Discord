// Settings from environment variables that several parts of the app share

import "dotenv/config";

export const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

// テストで差し替えられるよう、呼ばれたときに読む
export function isDatabaseConfigured() {
    return Boolean(process.env.DATABASE_URL);
}

// ダッシュボードの URL。サーバーや開くタブなどを付けられる
export function dashboardUrl(params: Record<string, string> = {}) {
    const url = new URL("/dashboard/", BASE_URL);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

    return url.toString();
}
