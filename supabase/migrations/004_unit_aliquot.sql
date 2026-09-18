-- Migration 004: Unit aliquot percentage for proportional expense splitting
-- Run this in Supabase SQL Editor after 003 migrations.

ALTER TABLE units ADD COLUMN IF NOT EXISTS aliquot numeric(8,7);
COMMENT ON COLUMN units.aliquot IS 'Aliquot percentage (0-100). Null = equal split fallback.';
