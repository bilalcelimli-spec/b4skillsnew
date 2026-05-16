-- Migration: 005_totp_2fa
-- Adds TOTP-based two-factor authentication fields to the User table.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "twoFactorSecret"  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT FALSE;
