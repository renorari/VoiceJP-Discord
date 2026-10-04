-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('RECORDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "startedBy" TEXT NOT NULL,
    "status" "RecordingStatus" NOT NULL DEFAULT 'RECORDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "audioFile" TEXT,
    "transcript" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recording_guildId_startedAt_idx" ON "Recording"("guildId", "startedAt");

-- CreateIndex
CREATE INDEX "Recording_expiresAt_idx" ON "Recording"("expiresAt");
