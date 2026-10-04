-- CreateEnum
CREATE TYPE "SpeechEngine" AS ENUM ('FREE', 'PLUS');

-- CreateTable
CREATE TABLE "GuildSettings" (
    "guildId" TEXT NOT NULL,
    "synthesisEngine" "SpeechEngine" NOT NULL DEFAULT 'PLUS',
    "recognitionEngine" "SpeechEngine" NOT NULL DEFAULT 'PLUS',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildSettings_pkey" PRIMARY KEY ("guildId")
);
