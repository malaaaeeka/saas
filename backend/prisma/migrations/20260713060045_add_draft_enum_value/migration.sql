-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "buyerId" TEXT;

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerNtn" TEXT,
    "buyerCnic" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Buyer_businessId_buyerName_idx" ON "Buyer"("businessId", "buyerName");

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_businessId_buyerNtn_key" ON "Buyer"("businessId", "buyerNtn");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buyer" ADD CONSTRAINT "Buyer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
