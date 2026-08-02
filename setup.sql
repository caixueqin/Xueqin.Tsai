-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "pin" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "currentSectionId" TEXT,
    "specialPrizeRate" INTEGER NOT NULL DEFAULT 1,
    "firstPrizeRate" INTEGER NOT NULL DEFAULT 9,
    "secondPrizeRate" INTEGER NOT NULL DEFAULT 30,
    "thirdPrizeRate" INTEGER NOT NULL DEFAULT 60,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Child_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleZh" TEXT,
    "orderIndex" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleZh" TEXT,
    "sectionType" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    CONSTRAINT "Section_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CheckItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "itemGroup" TEXT,
    "itemType" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelZh" TEXT,
    "isRepeatable" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL,
    CONSTRAINT "CheckItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Checkmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "checkItemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "parentReviewStatus" TEXT NOT NULL DEFAULT 'unreviewed',
    "parentNote" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undoneByUserId" TEXT,
    "undoneAt" DATETIME,
    CONSTRAINT "Checkmark_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Checkmark_checkItemId_fkey" FOREIGN KEY ("checkItemId") REFERENCES "CheckItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Checkmark_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Checkmark_undoneByUserId_fkey" FOREIGN KEY ("undoneByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Child_userId_key" ON "Child"("userId");
