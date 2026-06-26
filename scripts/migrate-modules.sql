-- ═══════════════════════════════════════════════════════════════
-- Migration: Add Compensation + SponsoredOffer tables
-- Run via: bun scripts/migrate-modules.ts
-- ═══════════════════════════════════════════════════════════════

-- Module 1: Compensation Retard Manqué
CREATE TABLE IF NOT EXISTS "Compensation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "billetId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amountFcfa" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'missed_delay',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "hadGpsTracking" BOOLEAN NOT NULL DEFAULT false,
    "lastDistanceMeters" INTEGER,
    "lastEtaMinutes" INTEGER,
    "wasMovingTowardsQuay" BOOLEAN NOT NULL DEFAULT false,
    "voucherCode" TEXT NOT NULL UNIQUE,
    "redeemedAt" DATETIME,
    "redeemedByBilletId" TEXT,
    "issuedBy" TEXT,
    "issuedByAudit" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
    FOREIGN KEY ("billetId") REFERENCES "Billet"("id"),
    FOREIGN KEY ("clientId") REFERENCES "User"("id"),
    FOREIGN KEY ("issuedByAudit") REFERENCES "AuditLog"("id")
);

CREATE INDEX IF NOT EXISTS "Compensation_tenantId_idx" ON "Compensation"("tenantId");
CREATE INDEX IF NOT EXISTS "Compensation_clientId_idx" ON "Compensation"("clientId");
CREATE INDEX IF NOT EXISTS "Compensation_status_idx" ON "Compensation"("status");
CREATE INDEX IF NOT EXISTS "Compensation_voucherCode_idx" ON "Compensation"("voucherCode");
CREATE INDEX IF NOT EXISTS "Compensation_billetId_idx" ON "Compensation"("billetId");

-- Module 2: Sponsored Offers
CREATE TABLE IF NOT EXISTS "SponsoredOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL DEFAULT 'tenant',
    "tenantId" TEXT,
    "targetPwa" TEXT NOT NULL DEFAULT 'client',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT 'En savoir plus',
    "ctaUrl" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL DEFAULT '#4A90E2',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxImpressions" INTEGER,
    "maxClicks" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "impressionsCount" INTEGER NOT NULL DEFAULT 0,
    "clicksCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

CREATE INDEX IF NOT EXISTS "SponsoredOffer_tenantId_idx" ON "SponsoredOffer"("tenantId");
CREATE INDEX IF NOT EXISTS "SponsoredOffer_scope_idx" ON "SponsoredOffer"("scope");
CREATE INDEX IF NOT EXISTS "SponsoredOffer_targetPwa_idx" ON "SponsoredOffer"("targetPwa");
CREATE INDEX IF NOT EXISTS "SponsoredOffer_isActive_idx" ON "SponsoredOffer"("isActive");
CREATE INDEX IF NOT EXISTS "SponsoredOffer_priority_idx" ON "SponsoredOffer"("priority");

CREATE TABLE IF NOT EXISTS "OfferImpression" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerId" TEXT NOT NULL,
    "userId" TEXT,
    "tenantId" TEXT,
    "pwa" TEXT NOT NULL,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("offerId") REFERENCES "SponsoredOffer"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "OfferImpression_offerId_idx" ON "OfferImpression"("offerId");
CREATE INDEX IF NOT EXISTS "OfferImpression_userId_idx" ON "OfferImpression"("userId");
CREATE INDEX IF NOT EXISTS "OfferImpression_createdAt_idx" ON "OfferImpression"("createdAt");

CREATE TABLE IF NOT EXISTS "OfferClick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerId" TEXT NOT NULL,
    "userId" TEXT,
    "tenantId" TEXT,
    "pwa" TEXT NOT NULL,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "referer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("offerId") REFERENCES "SponsoredOffer"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "OfferClick_offerId_idx" ON "OfferClick"("offerId");
CREATE INDEX IF NOT EXISTS "OfferClick_userId_idx" ON "OfferClick"("userId");
CREATE INDEX IF NOT EXISTS "OfferClick_createdAt_idx" ON "OfferClick"("createdAt");
