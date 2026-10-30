-- Migration 007: Upsert additional units
-- Adds 4 new Torre B units (BO164, BO181, BO182, BOPB2) and ensures
-- CO042/CO052/CO133 (already in 006) carry their canonical values.
-- Idempotent: ON CONFLICT (id) only refreshes num/floor/type/aliquot.
--
BEGIN;

INSERT INTO units (id, building, num, floor, type, aliquot, owner, owner_status, claim_blocked_until, created_at, updated_at) VALUES
  ('f5e6a7b8-1c2d-3e4f-5a6b-7c8d9e0f1a2b', 'yIjvTgPKvFTtNrLMrDlx', 'BO164', 0, 'office', 0.238655, NULL, NULL, NULL, NOW(), NOW()),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'yIjvTgPKvFTtNrLMrDlx', 'BO181', 18, 'office', 0.529468, NULL, NULL, NULL, NOW(), NOW()),
  ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'yIjvTgPKvFTtNrLMrDlx', 'BO182', 18, 'office', 0.529468, NULL, NULL, NULL, NOW(), NOW()),
  ('9a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d', 'yIjvTgPKvFTtNrLMrDlx', 'BOPB2', 0, 'office', 1.179787, NULL, NULL, NULL, NOW(), NOW()),
  ('c7a8b9e1-2f3a-4b6c-8d1e-f9a0b1c2d3e4', 'hIjbDTUS4zX8K1HbRdxk', 'CO042', 0, 'office', 0.344392, NULL, NULL, NULL, NOW(), NOW()),
  ('d8b9c0f2-3a4b-5c7d-9e2f-a0b1c2d3e4f5', 'hIjbDTUS4zX8K1HbRdxk', 'CO052', 0, 'office', 0.331186, NULL, NULL, NULL, NOW(), NOW()),
  ('e9c0d1a3-4b5c-6d8e-0f3a-b1c2d3e4f5a6', 'hIjbDTUS4zX8K1HbRdxk', 'CO133', 1, 'office', 0.51586, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  building = EXCLUDED.building,
  num      = EXCLUDED.num,
  floor    = EXCLUDED.floor,
  type     = EXCLUDED.type,
  aliquot  = EXCLUDED.aliquot,
  updated_at = NOW();

COMMIT;
