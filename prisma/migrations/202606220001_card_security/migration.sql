ALTER TABLE "Checkmark" ADD COLUMN "awardKey" TEXT;

CREATE TABLE "MiningChoiceClaim" (
    "nonce" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
CREATE UNIQUE INDEX "Checkmark_awardKey_key" ON "Checkmark"("awardKey");
CREATE INDEX "MiningChoiceClaim_childId_claimedAt_idx" ON "MiningChoiceClaim"("childId", "claimedAt");
