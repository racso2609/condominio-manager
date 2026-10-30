-- Migration 012: Normalize all table Primary Keys and Foreign Keys to native UUID with gen_random_uuid() defaults.
-- Run in Supabase SQL Editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create mapping of existing non-UUID IDs to stable deterministic UUIDs
CREATE TEMP TABLE IF NOT EXISTS id_mappings (
  table_name text NOT NULL,
  old_id text NOT NULL,
  new_id uuid NOT NULL,
  PRIMARY KEY (table_name, old_id)
);

-- Generate deterministic UUIDs (UUID v5 using namespace or gen_random_uuid()) for non-UUID strings
INSERT INTO id_mappings (table_name, old_id, new_id)
SELECT 'users', id, gen_random_uuid()
FROM users
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

INSERT INTO id_mappings (table_name, old_id, new_id)
SELECT 'condominiums', id, gen_random_uuid()
FROM condominiums
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

INSERT INTO id_mappings (table_name, old_id, new_id)
SELECT 'condominium_roles', id, gen_random_uuid()
FROM condominium_roles
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

INSERT INTO id_mappings (table_name, old_id, new_id)
SELECT 'buildings', id, gen_random_uuid()
FROM buildings
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

INSERT INTO id_mappings (table_name, old_id, new_id)
SELECT 'units', id, gen_random_uuid()
FROM units
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

INSERT INTO id_mappings (table_name, old_id, new_id)
SELECT 'expenses', id, gen_random_uuid()
FROM expenses
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

INSERT INTO id_mappings (table_name, old_id, new_id)
SELECT 'expense_entries', id, gen_random_uuid()
FROM expense_entries
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

INSERT INTO id_mappings (table_name, old_id, new_id)
SELECT 'announcements', id, gen_random_uuid()
FROM announcements
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

INSERT INTO id_mappings (table_name, old_id, new_id)
SELECT 'payment_methods', id, gen_random_uuid()
FROM payment_methods
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

INSERT INTO id_mappings (table_name, old_id, new_id)
SELECT 'complaints', id, gen_random_uuid()
FROM complaints
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Drop all foreign key constraints before altering columns
ALTER TABLE condominiums DROP CONSTRAINT IF EXISTS condominiums_creator_fkey;

ALTER TABLE condominium_roles DROP CONSTRAINT IF EXISTS condominium_roles_condominium_fkey;
ALTER TABLE condominium_roles DROP CONSTRAINT IF EXISTS condominium_roles_user_fkey;
ALTER TABLE condominium_roles DROP CONSTRAINT IF EXISTS condominium_roles_invited_by_fkey;
ALTER TABLE condominium_roles DROP CONSTRAINT IF EXISTS condominium_roles_building_fkey;

ALTER TABLE buildings DROP CONSTRAINT IF EXISTS buildings_condominium_fkey;

ALTER TABLE units DROP CONSTRAINT IF EXISTS units_building_fkey;
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_owner_fkey;

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_condominium_fkey;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_building_fkey;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_deleted_by_fkey;

ALTER TABLE expense_entries DROP CONSTRAINT IF EXISTS expense_entries_expense_fkey;
ALTER TABLE expense_entries DROP CONSTRAINT IF EXISTS expense_entries_unit_fkey;
ALTER TABLE expense_entries DROP CONSTRAINT IF EXISTS expense_entries_reported_by_fkey;
ALTER TABLE expense_entries DROP CONSTRAINT IF EXISTS expense_entries_validated_by_fkey;
ALTER TABLE expense_entries DROP CONSTRAINT IF EXISTS expense_entries_payment_method_id_fkey;

ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_condominium_fkey;
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_author_fkey;

ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS payment_methods_condominium_fkey;

ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_condominium_fkey;
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_author_fkey;
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_resolved_by_fkey;

-- 3. Update existing data using mapping table
-- Update users
UPDATE users u
SET id = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'users' AND u.id = m.old_id;

-- Update condominiums
UPDATE condominiums c
SET id = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'condominiums' AND c.id = m.old_id;

UPDATE condominiums c
SET creator = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'users' AND c.creator = m.old_id;

-- Update condominium_roles
UPDATE condominium_roles cr
SET id = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'condominium_roles' AND cr.id = m.old_id;

UPDATE condominium_roles cr
SET condominium = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'condominiums' AND cr.condominium = m.old_id;

UPDATE condominium_roles cr
SET "user" = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'users' AND cr."user" = m.old_id;

UPDATE condominium_roles cr
SET invited_by = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'users' AND cr.invited_by = m.old_id;

-- Update buildings
UPDATE buildings b
SET id = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'buildings' AND b.id = m.old_id;

UPDATE buildings b
SET condominium = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'condominiums' AND b.condominium = m.old_id;

-- Update units
UPDATE units u
SET id = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'units' AND u.id = m.old_id;

UPDATE units u
SET building = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'buildings' AND u.building = m.old_id;

UPDATE units u
SET owner = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'users' AND u.owner = m.old_id;

-- Update expenses
UPDATE expenses e
SET id = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'expenses' AND e.id = m.old_id;

UPDATE expenses e
SET condominium = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'condominiums' AND e.condominium = m.old_id;

UPDATE expenses e
SET building = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'buildings' AND e.building = m.old_id;

-- Update expense_entries
UPDATE expense_entries ee
SET id = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'expense_entries' AND ee.id = m.old_id;

UPDATE expense_entries ee
SET expense = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'expenses' AND ee.expense = m.old_id;

UPDATE expense_entries ee
SET unit = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'units' AND ee.unit = m.old_id;

UPDATE expense_entries ee
SET reported_by = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'users' AND ee.reported_by = m.old_id;

UPDATE expense_entries ee
SET validated_by = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'users' AND ee.validated_by = m.old_id;

UPDATE expense_entries ee
SET payment_method_id = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'payment_methods' AND ee.payment_method_id = m.old_id;

-- Update announcements
UPDATE announcements a
SET id = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'announcements' AND a.id = m.old_id;

UPDATE announcements a
SET condominium = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'condominiums' AND a.condominium = m.old_id;

UPDATE announcements a
SET author = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'users' AND a.author = m.old_id;

-- Update payment_methods
UPDATE payment_methods pm
SET id = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'payment_methods' AND pm.id = m.old_id;

UPDATE payment_methods pm
SET condominium = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'condominiums' AND pm.condominium = m.old_id;

-- Update complaints
UPDATE complaints c
SET id = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'complaints' AND c.id = m.old_id;

UPDATE complaints c
SET condominium = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'condominiums' AND c.condominium = m.old_id;

UPDATE complaints c
SET author = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'users' AND c.author = m.old_id;

UPDATE complaints c
SET resolved_by = m.new_id::text
FROM id_mappings m
WHERE m.table_name = 'users' AND c.resolved_by = m.old_id;

-- 4. Convert all ID columns and FK columns from text to native uuid with DEFAULT gen_random_uuid()

-- users
ALTER TABLE users
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- condominiums
ALTER TABLE condominiums
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN creator TYPE uuid USING creator::uuid;

-- condominium_roles
ALTER TABLE condominium_roles
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN condominium TYPE uuid USING condominium::uuid,
  ALTER COLUMN "user" TYPE uuid USING "user"::uuid,
  ALTER COLUMN invited_by TYPE uuid USING invited_by::uuid;

-- buildings
ALTER TABLE buildings
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN condominium TYPE uuid USING condominium::uuid;

-- units
ALTER TABLE units
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN building TYPE uuid USING building::uuid,
  ALTER COLUMN owner TYPE uuid USING owner::uuid;

-- expenses
ALTER TABLE expenses
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN condominium TYPE uuid USING condominium::uuid,
  ALTER COLUMN building TYPE uuid USING building::uuid;

-- expense_entries
ALTER TABLE expense_entries
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN expense TYPE uuid USING expense::uuid,
  ALTER COLUMN unit TYPE uuid USING unit::uuid,
  ALTER COLUMN reported_by TYPE uuid USING reported_by::uuid,
  ALTER COLUMN validated_by TYPE uuid USING validated_by::uuid,
  ALTER COLUMN payment_method_id TYPE uuid USING payment_method_id::uuid;

-- announcements
ALTER TABLE announcements
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN condominium TYPE uuid USING condominium::uuid,
  ALTER COLUMN author TYPE uuid USING author::uuid;

-- payment_methods
ALTER TABLE payment_methods
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN condominium TYPE uuid USING condominium::uuid;

-- complaints
ALTER TABLE complaints
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN condominium TYPE uuid USING condominium::uuid,
  ALTER COLUMN author TYPE uuid USING author::uuid,
  ALTER COLUMN resolved_by TYPE uuid USING resolved_by::uuid;

-- 5. Recreate foreign key constraints with ON UPDATE CASCADE / ON DELETE CASCADE
ALTER TABLE condominiums
  ADD CONSTRAINT condominiums_creator_fkey FOREIGN KEY (creator) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE condominium_roles
  ADD CONSTRAINT condominium_roles_condominium_fkey FOREIGN KEY (condominium) REFERENCES condominiums(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT condominium_roles_user_fkey FOREIGN KEY ("user") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT condominium_roles_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE buildings
  ADD CONSTRAINT buildings_condominium_fkey FOREIGN KEY (condominium) REFERENCES condominiums(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE units
  ADD CONSTRAINT units_building_fkey FOREIGN KEY (building) REFERENCES buildings(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT units_owner_fkey FOREIGN KEY (owner) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_condominium_fkey FOREIGN KEY (condominium) REFERENCES condominiums(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT expenses_building_fkey FOREIGN KEY (building) REFERENCES buildings(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE expense_entries
  ADD CONSTRAINT expense_entries_expense_fkey FOREIGN KEY (expense) REFERENCES expenses(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT expense_entries_unit_fkey FOREIGN KEY (unit) REFERENCES units(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT expense_entries_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT expense_entries_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT expense_entries_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE announcements
  ADD CONSTRAINT announcements_condominium_fkey FOREIGN KEY (condominium) REFERENCES condominiums(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT announcements_author_fkey FOREIGN KEY (author) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE payment_methods
  ADD CONSTRAINT payment_methods_condominium_fkey FOREIGN KEY (condominium) REFERENCES condominiums(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE complaints
  ADD CONSTRAINT complaints_condominium_fkey FOREIGN KEY (condominium) REFERENCES condominiums(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT complaints_author_fkey FOREIGN KEY (author) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT complaints_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Update helper functions with UUID parameter types
CREATE OR REPLACE FUNCTION is_condominium_admin(condominium_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM condominium_roles
    WHERE condominium = condominium_id
      AND "user" = auth.uid()
      AND role = 'administrator'
      AND status = 'verified'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_condominium_member(condominium_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM condominium_roles
    WHERE condominium = condominium_id
      AND "user" = auth.uid()
      AND status = 'verified'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
