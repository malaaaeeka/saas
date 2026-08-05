-- CreateTable
CREATE TABLE "BulkBatch" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulkBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkBatchResult" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fbrInvoiceNo" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulkBatchResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BulkBatch" ADD CONSTRAINT "BulkBatch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkBatchResult" ADD CONSTRAINT "BulkBatchResult_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BulkBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
