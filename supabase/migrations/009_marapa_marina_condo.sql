-- Migration 009: Crea el condominio "Marapa Marina"
--
-- Estructura:
--   - 3 torres: D, E, F
--   - PB (floor 0): 5 apartamentos (num "{TORRE}-01" .. "{TORRE}-05")
--   - Pisos 1..14: 6 apartamentos por piso (num "{TORRE}-{piso}{n}")
--     ej. torre D piso 2 apto 2 -> "D-22", torre D piso 13 apto 2 -> "D-132"
--   - aliquot = NULL (reparto equitativo por defecto)
--
-- Administradores (condominium_roles: role='administrator', status='verified'):
--   - oscaremiliolugo@gmail.com  (se crea si no existe)
--   - oscarlugourbaez@gmail.com  (se crea, es preregistrado hasta su primer login)
--
-- Idempotente: usa ids fijos y ON CONFLICT.
-- Ejecutar en el SQL Editor de Supabase (usa rol service_role, evita RLS).
-- Sin tablas temporales: todo va en CTEs/subconsultas (compat con SQL Editor).

-- 1. Asegura los usuarios administradores -------------------------------------

INSERT INTO users (id, name, email, role, is_preregistered, created_at, updated_at)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'oscaremiliolugo', 'oscaremiliolugo@gmail.com', 'user', true, now(), now()),
  ('a0000000-0000-4000-8000-000000000002', 'oscarlugourbaez', 'oscarlugourbaez@gmail.com', 'user', true, now(), now())
ON CONFLICT (email) DO NOTHING;

-- 2. Condominio ----------------------------------------------------------------

INSERT INTO condominiums (id, name, address, creator, status, created_at, updated_at)
VALUES (
  'c0000000-0000-4000-8000-000000000001',
  'Marapa Marina',
  'Marapa Marina',
  (SELECT id FROM users WHERE email = 'oscaremiliolugo@gmail.com'),
  'complete',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  creator = EXCLUDED.creator,
  status = EXCLUDED.status,
  updated_at = now();

-- 3. Roles de administrador (verificados) -------------------------------------

INSERT INTO condominium_roles (id, condominium, "user", role, status, created_at, updated_at)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   (SELECT id FROM users WHERE email = 'oscaremiliolugo@gmail.com'),
   'administrator', 'verified', now(), now()),
  ('a1000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
   (SELECT id FROM users WHERE email = 'oscarlugourbaez@gmail.com'),
   'administrator', 'verified', now(), now())
ON CONFLICT (id) DO UPDATE SET
  condominium = EXCLUDED.condominium,
  "user" = EXCLUDED."user",
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = now();

-- 4. Torres D, E, F ------------------------------------------------------------

INSERT INTO buildings (id, condominium, name, symbol, address, created_at, updated_at)
VALUES
  ('b0000000-0000-4000-8000-00000000000d', 'c0000000-0000-4000-8000-000000000001', 'Torre D', 'D', '', now(), now()),
  ('b0000000-0000-4000-8000-00000000000e', 'c0000000-0000-4000-8000-000000000001', 'Torre E', 'E', '', now(), now()),
  ('b0000000-0000-4000-8000-00000000000f', 'c0000000-0000-4000-8000-000000000001', 'Torre F', 'F', '', now(), now())
ON CONFLICT (id) DO UPDATE SET
  condominium = EXCLUDED.condominium,
  name = EXCLUDED.name,
  symbol = EXCLUDED.symbol,
  updated_at = now();

-- 5. Unidades ------------------------------------------------------------------
-- PB (floor 0): 5 unidades  -> {T}-01 .. {T}-05
-- Pisos 1..14:  6 unidades  -> {T}-{piso}{n}  (n = 1..6)

WITH towers (symbol, building_id) AS (
  VALUES
    ('D', 'b0000000-0000-4000-8000-00000000000d'),
    ('E', 'b0000000-0000-4000-8000-00000000000e'),
    ('F', 'b0000000-0000-4000-8000-00000000000f')
),
units_all AS (
  SELECT t.symbol, t.building_id, 0 AS floor, n AS n,
         t.symbol || '-0' || n::text AS num
  FROM towers t
  CROSS JOIN generate_series(1, 5) AS n

  UNION ALL

  SELECT t.symbol, t.building_id, f AS floor, n AS n,
         t.symbol || '-' || f::text || n::text AS num
  FROM towers t
  CROSS JOIN generate_series(1, 14) AS f
  CROSS JOIN generate_series(1, 6) AS n
)
INSERT INTO units (id, building, num, floor, type, aliquot, owner, owner_status, claim_blocked_until, created_at, updated_at)
SELECT
  'd0000000-0000-4000-8000-0000000' ||
    (ascii(u.symbol) - ascii('A') + 1)::text ||
    lpad(u.floor::text, 2, '0') ||
    lpad(u.n::text, 2, '0'),
  u.building_id,
  u.num,
  u.floor,
  'residential',
  NULL,
  NULL,
  NULL,
  NULL,
  now(),
  now()
FROM units_all u
ON CONFLICT (id) DO UPDATE SET
  building = EXCLUDED.building,
  num = EXCLUDED.num,
  floor = EXCLUDED.floor,
  type = EXCLUDED.type,
  updated_at = now();
