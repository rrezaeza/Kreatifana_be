/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "ProductFeature" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ProductFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductFeature_productId_text_key" ON "ProductFeature"("productId", "text");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- AddForeignKey
ALTER TABLE "ProductFeature" ADD CONSTRAINT "ProductFeature_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
