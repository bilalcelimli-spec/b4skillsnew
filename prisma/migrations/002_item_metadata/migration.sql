-- Phase 4 / Faz I: Add metadata column to Item for pipeline tracking

ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
