/*
  Warnings:

  - A unique constraint covering the columns `[businessId,buyerCnic]` on the table `Buyer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Buyer_businessId_buyerCnic_key" ON "Buyer"("businessId", "buyerCnic");
