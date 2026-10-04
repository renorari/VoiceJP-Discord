import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
    "schema": "prisma/schema.prisma",
    "migrations": { "path": "prisma/migrations" },
    // generate は接続先が無くても動くように、未設定のときは空文字にしておく
    "datasource": { "url": process.env.DATABASE_URL ?? "" }
});
