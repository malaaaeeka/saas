-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'AMENDED';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "amendmentReason" TEXT,
ADD COLUMN     "originalInvoiceId" TEXT;
