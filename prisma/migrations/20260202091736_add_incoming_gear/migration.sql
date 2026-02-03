-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING_REVIEW', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'ADDED_TO_INVENTORY', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PRICE_ADJUSTED', 'ADDED_TO_INVENTORY');

-- CreateTable
CREATE TABLE "pending_purchases" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "whatsappConversationId" TEXT,
    "totalQuoteAmount" DECIMAL(10,2),
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "botQuoteAcceptedAt" TIMESTAMP(3),
    "botConversationData" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_items" (
    "id" TEXT NOT NULL,
    "pendingPurchaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "category" TEXT,
    "condition" TEXT,
    "description" TEXT,
    "serialNumber" TEXT,
    "botEstimatedPrice" DECIMAL(10,2),
    "proposedPrice" DECIMAL(10,2),
    "finalPrice" DECIMAL(10,2),
    "suggestedSellPrice" DECIMAL(10,2),
    "status" "ItemStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "imageUrls" TEXT[],
    "equipmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_purchases_status_idx" ON "pending_purchases"("status");

-- CreateIndex
CREATE INDEX "pending_purchases_customerPhone_idx" ON "pending_purchases"("customerPhone");

-- CreateIndex
CREATE INDEX "pending_purchases_whatsappConversationId_idx" ON "pending_purchases"("whatsappConversationId");

-- CreateIndex
CREATE INDEX "pending_items_pendingPurchaseId_idx" ON "pending_items"("pendingPurchaseId");

-- CreateIndex
CREATE INDEX "pending_items_status_idx" ON "pending_items"("status");

-- AddForeignKey
ALTER TABLE "pending_purchases" ADD CONSTRAINT "pending_purchases_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_purchases" ADD CONSTRAINT "pending_purchases_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_purchases" ADD CONSTRAINT "pending_purchases_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_items" ADD CONSTRAINT "pending_items_pendingPurchaseId_fkey" FOREIGN KEY ("pendingPurchaseId") REFERENCES "pending_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
