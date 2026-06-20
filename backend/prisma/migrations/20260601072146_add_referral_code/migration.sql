/*
  Warnings:

  - A unique constraint covering the columns `[referralCode]` on the table `CAProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CAProfile" ADD COLUMN     "referralCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CAProfile_referralCode_key" ON "CAProfile"("referralCode");
