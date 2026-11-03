ALTER TABLE "PaymentTransaction" ADD COLUMN "metadata" JSONB;
ALTER TABLE "PaymentTransaction" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "PaymentTransaction" ADD COLUMN "licenseId" TEXT;
CREATE UNIQUE INDEX "PaymentTransaction_licenseId_key" ON "PaymentTransaction"("licenseId");
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;
