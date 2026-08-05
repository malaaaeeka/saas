-- CreateIndex
CREATE INDEX "Invoice_businessId_status_invoiceType_idx" ON "Invoice"("businessId", "status", "invoiceType");

-- CreateIndex
CREATE INDEX "Invoice_businessId_createdAt_idx" ON "Invoice"("businessId", "createdAt");
