-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startPage" TEXT NOT NULL,
    "endPage" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "clicks" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "userId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "totalDurationSeconds" BIGINT NOT NULL DEFAULT 0,
    "fastestDurationSeconds" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "Game_userId_createdAt_idx" ON "Game"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
