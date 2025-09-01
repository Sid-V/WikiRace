-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "status" "GameStatus" NOT NULL DEFAULT 'IN_PROGRESS';

-- CreateIndex
CREATE INDEX "Game_status_startTime_idx" ON "Game"("status", "startTime");
