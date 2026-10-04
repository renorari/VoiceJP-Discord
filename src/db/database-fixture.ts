// Database settings for tests: only TEST_DATABASE_URL is used, so a real database is never touched

import "dotenv/config";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "";

export const skip = !process.env.TEST_DATABASE_URL;
