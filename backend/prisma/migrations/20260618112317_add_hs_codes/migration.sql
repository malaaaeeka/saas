-- CreateTable
CREATE TABLE "HsCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fullEntry" TEXT NOT NULL,

    CONSTRAINT "HsCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HsCode_code_idx" ON "HsCode"("code");

-- CreateIndex
CREATE INDEX "HsCode_description_idx" ON "HsCode"("description");
