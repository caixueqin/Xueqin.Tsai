CREATE TABLE "UserMineralCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "ownedCount" INTEGER NOT NULL DEFAULT 1,
    "firstObtainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObtainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserMineralCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "MineralDrawRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "prizeTier" TEXT NOT NULL,
    "isNew" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MineralDrawRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserMineralCollection_userId_cardId_key" ON "UserMineralCollection"("userId", "cardId");
CREATE INDEX "UserMineralCollection_userId_idx" ON "UserMineralCollection"("userId");
CREATE INDEX "MineralDrawRecord_userId_createdAt_idx" ON "MineralDrawRecord"("userId", "createdAt");
