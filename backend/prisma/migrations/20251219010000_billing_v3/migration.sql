-- Billing v3: Appointment-based billing (keep existing Order/Installment)

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('OPEN', 'SETTLED', 'VOID');

-- CreateEnum
CREATE TYPE "AllocationTarget" AS ENUM ('ARTIST', 'SHOP');

-- CreateTable
CREATE TABLE "AppointmentBill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "artistId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "listTotal" INTEGER NOT NULL,
    "discountTotal" INTEGER NOT NULL DEFAULT 0,
    "billTotal" INTEGER NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'OPEN',
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "AppointmentBill_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AppointmentBill_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AppointmentBill_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AppointmentBill_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppointmentBillItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "serviceId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "basePriceSnapshot" INTEGER NOT NULL,
    "finalPriceSnapshot" INTEGER NOT NULL,
    "variantsSnapshot" JSONB,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentBillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "AppointmentBill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppointmentBillItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "paidAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "notes" TEXT,
    "refundOfPaymentId" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "AppointmentBill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_refundOfPaymentId_fkey" FOREIGN KEY ("refundOfPaymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "target" "AllocationTarget" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArtistSplitRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistId" TEXT NOT NULL,
    "branchId" TEXT,
    "artistRateBps" INTEGER NOT NULL DEFAULT 7000,
    "shopRateBps" INTEGER NOT NULL DEFAULT 3000,
    "effectiveFrom" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "ArtistSplitRule_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ArtistSplitRule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentBill_appointmentId_key" ON "AppointmentBill"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentBill_branchId_createdAt_status_idx" ON "AppointmentBill"("branchId", "createdAt", "status");
CREATE INDEX "AppointmentBill_customerId_status_idx" ON "AppointmentBill"("customerId", "status");
CREATE INDEX "AppointmentBill_artistId_status_idx" ON "AppointmentBill"("artistId", "status");

-- CreateIndex
CREATE INDEX "AppointmentBillItem_billId_sortOrder_idx" ON "AppointmentBillItem"("billId", "sortOrder");

-- CreateIndex
CREATE INDEX "Payment_billId_paidAt_idx" ON "Payment"("billId", "paidAt");
CREATE INDEX "Payment_recordedById_paidAt_idx" ON "Payment"("recordedById", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAllocation_paymentId_target_key" ON "PaymentAllocation"("paymentId", "target");
CREATE INDEX "PaymentAllocation_target_createdAt_idx" ON "PaymentAllocation"("target", "createdAt");

-- CreateIndex
CREATE INDEX "ArtistSplitRule_artistId_branchId_effectiveFrom_idx" ON "ArtistSplitRule"("artistId", "branchId", "effectiveFrom");


