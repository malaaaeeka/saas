-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "rootInvoiceId" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_businessId_rootInvoiceId_idx" ON "Invoice"("businessId", "rootInvoiceId");
