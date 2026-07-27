-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "buyerType" TEXT,
ADD COLUMN     "destinationProvince" TEXT,
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "originationProvince" TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "invoiceRefNo" TEXT;
