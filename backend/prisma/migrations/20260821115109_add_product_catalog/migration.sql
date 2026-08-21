-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hsCode" TEXT,
    "hsCodeDescription" TEXT,
    "uom" TEXT,
    "rate" DECIMAL(65,30),
    "taxRate" TEXT,
    "sroSchedule" TEXT,
    "itemSNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_businessId_description_idx" ON "Product"("businessId", "description");

-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_description_key" ON "Product"("businessId", "description");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
