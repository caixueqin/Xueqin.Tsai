ALTER TABLE "MineralDrawRecord" ADD COLUMN "prizeDrawId" TEXT;
ALTER TABLE "MineralDrawRecord" ADD COLUMN "revokedAt" DATETIME;

CREATE UNIQUE INDEX "MineralDrawRecord_prizeDrawId_key" ON "MineralDrawRecord"("prizeDrawId");
