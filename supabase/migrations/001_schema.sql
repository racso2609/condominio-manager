-- Condominio Gestión - Supabase schema
-- Run this in Supabase SQL Editor before migrating data

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('admin', 'user', 'administrator');
CREATE TYPE condominium_status AS ENUM ('draft', 'complete');
CREATE TYPE role_type AS ENUM ('administrator', 'resident');
CREATE TYPE role_status AS ENUM ('pending', 'verified');
CREATE TYPE unit_type AS ENUM ('residential', 'office');
CREATE TYPE expense_entry_status AS ENUM ('pending', 'pending_validation', 'paid', 'overdue');
CREATE TYPE payment_method_type AS ENUM ('bank_transfer', 'mobile_payment', 'zelle', 'paypal', 'venmo', 'cash', 'other');
CREATE TYPE complaint_status AS ENUM ('pending', 'in_progress', 'resolved');
CREATE TYPE file_type AS ENUM ('image', 'document');

CREATE TYPE announcement_file AS (name text, url text, type file_type);
CREATE TYPE complaint_file AS (name text, url text, type file_type);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role user_role NOT NULL DEFAULT 'user',
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS condominiums (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  creator text NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  status condominium_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS condominium_roles (
  id text PRIMARY KEY,
  condominium text NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  "user" text REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  role role_type NOT NULL,
  status role_status NOT NULL DEFAULT 'pending',
  invited_email text,
  invited_by text REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  token text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buildings (
  id text PRIMARY KEY,
  condominium text NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  name text NOT NULL,
  symbol text NOT NULL,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS units (
  id text PRIMARY KEY,
  building text NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  num text NOT NULL,
  floor integer NOT NULL,
  type unit_type NOT NULL DEFAULT 'residential',
  owner text REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  owner_status role_status,
  claim_blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id text PRIMARY KEY,
  condominium text REFERENCES condominiums(id) ON DELETE CASCADE,
  building text REFERENCES buildings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  amount numeric(12, 2) NOT NULL,
  due_date timestamptz NOT NULL,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_entries (
  id text PRIMARY KEY,
  expense text NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  unit text NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  status expense_entry_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  payment_method_id text,
  payment_reference text,
  payment_proof_url text,
  notes text,
  reported_by text REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  reported_at timestamptz,
  validated_by text REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id text PRIMARY KEY,
  condominium text NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  files announcement_file[] DEFAULT '{}',
  author text NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id text PRIMARY KEY,
  condominium text NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  name text NOT NULL,
  type payment_method_type NOT NULL,
  holder_name text,
  bank_name text,
  account_number text,
  routing_number text,
  phone text,
  email text,
  identification text,
  notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaints (
  id text PRIMARY KEY,
  condominium text NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  files complaint_file[] DEFAULT '{}',
  author text NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  status complaint_status NOT NULL DEFAULT 'pending',
  resolution_notes text,
  resolved_by text REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_condominiums_creator ON condominiums(creator);
CREATE INDEX IF NOT EXISTS idx_condominium_roles_condominium ON condominium_roles(condominium);
CREATE INDEX IF NOT EXISTS idx_condominium_roles_user ON condominium_roles("user");
CREATE INDEX IF NOT EXISTS idx_condominium_roles_email ON condominium_roles(invited_email);
CREATE INDEX IF NOT EXISTS idx_buildings_condominium ON buildings(condominium);
CREATE INDEX IF NOT EXISTS idx_units_building ON units(building);
CREATE INDEX IF NOT EXISTS idx_units_owner ON units(owner);
CREATE INDEX IF NOT EXISTS idx_expenses_condominium ON expenses(condominium);
CREATE INDEX IF NOT EXISTS idx_expenses_building ON expenses(building);
CREATE INDEX IF NOT EXISTS idx_expense_entries_expense ON expense_entries(expense);
CREATE INDEX IF NOT EXISTS idx_expense_entries_unit ON expense_entries(unit);
CREATE INDEX IF NOT EXISTS idx_announcements_condominium ON announcements(condominium);
CREATE INDEX IF NOT EXISTS idx_payment_methods_condominium ON payment_methods(condominium);
CREATE INDEX IF NOT EXISTS idx_complaints_condominium ON complaints(condominium);
CREATE INDEX IF NOT EXISTS idx_complaints_author ON complaints(author);

CREATE INDEX IF NOT EXISTS idx_announcements_condominium_created ON announcements(condominium, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_condominium_created ON expenses(condominium, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_building_created ON expenses(building, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_condominium_created ON complaints(condominium, created_at DESC);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE condominium_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_condominium_admin(condominium_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM condominium_roles
    WHERE condominium = condominium_id
      AND "user" = auth.uid()::text
      AND role = 'administrator'
      AND status = 'verified'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_condominium_member(condominium_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM condominium_roles
    WHERE condominium = condominium_id
      AND "user" = auth.uid()::text
      AND status = 'verified'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY users_select_self_or_admin ON users FOR SELECT
  USING (
    id = auth.uid()::text
    OR email = auth.email()
    OR EXISTS (
      SELECT 1 FROM condominium_roles
      WHERE "user" = users.id
        AND role = 'administrator'
        AND status = 'verified'
        AND condominium IN (
          SELECT condominium FROM condominium_roles
          WHERE "user" = auth.uid()::text AND status = 'verified'
        )
    )
  );

DROP POLICY IF EXISTS users_insert_self ON users;
CREATE POLICY users_insert_self ON users FOR INSERT
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY users_update_self ON users FOR UPDATE
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

-- Function to migrate a legacy Firebase UID to a Supabase Auth UUID.
-- SECURITY DEFINER bypasses RLS. The function verifies the caller can only
-- migrate to their own auth.uid().
CREATE OR REPLACE FUNCTION migrate_user_id(old_id text, new_id text)
RETURNS void AS $$
BEGIN
  IF new_id != auth.uid()::text THEN
    RAISE EXCEPTION 'Can only migrate to your own auth ID';
  END IF;

  UPDATE users SET id = new_id, updated_at = now() WHERE id = old_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY condominiums_select_member ON condominiums FOR SELECT
  USING (creator = auth.uid()::text OR is_condominium_member(id));

CREATE POLICY condominiums_insert_authenticated ON condominiums FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY condominiums_update_admin_or_creator ON condominiums FOR UPDATE
  USING (creator = auth.uid()::text OR is_condominium_admin(id))
  WITH CHECK (creator = auth.uid()::text OR is_condominium_admin(id));

CREATE POLICY condominiums_delete_creator ON condominiums FOR DELETE
  USING (creator = auth.uid()::text);

CREATE POLICY condominium_roles_select_involved ON condominium_roles FOR SELECT
  USING (
    "user" = auth.uid()::text
    OR invited_email = auth.email()
    OR is_condominium_admin(condominium)
  );

CREATE POLICY condominium_roles_insert_admin ON condominium_roles FOR INSERT
  WITH CHECK (is_condominium_admin(condominium));

CREATE POLICY condominium_roles_update_admin_or_self ON condominium_roles FOR UPDATE
  USING (
    is_condominium_admin(condominium)
    OR ("user" = auth.uid()::text AND status = 'pending')
  )
  WITH CHECK (
    is_condominium_admin(condominium)
    OR ("user" = auth.uid()::text AND status = 'pending')
  );

CREATE POLICY condominium_roles_delete_admin ON condominium_roles FOR DELETE
  USING (is_condominium_admin(condominium));

CREATE POLICY buildings_select_member ON buildings FOR SELECT
  USING (is_condominium_member(condominium));

CREATE POLICY buildings_insert_admin ON buildings FOR INSERT
  WITH CHECK (is_condominium_admin(condominium));

CREATE POLICY buildings_update_admin ON buildings FOR UPDATE
  USING (is_condominium_admin(condominium))
  WITH CHECK (is_condominium_admin(condominium));

CREATE POLICY buildings_delete_admin ON buildings FOR DELETE
  USING (is_condominium_admin(condominium));

CREATE POLICY units_select_member ON units FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM buildings
      WHERE buildings.id = units.building
        AND is_condominium_member(buildings.condominium)
    )
  );

CREATE POLICY units_insert_admin ON units FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM buildings
      WHERE buildings.id = units.building
        AND is_condominium_admin(buildings.condominium)
    )
  );

CREATE POLICY units_update_admin_or_owner ON units FOR UPDATE
  USING (
    owner = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM buildings
      WHERE buildings.id = units.building
        AND is_condominium_admin(buildings.condominium)
    )
  )
  WITH CHECK (
    owner = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM buildings
      WHERE buildings.id = units.building
        AND is_condominium_admin(buildings.condominium)
    )
  );

CREATE POLICY units_delete_admin ON units FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM buildings
      WHERE buildings.id = units.building
        AND is_condominium_admin(buildings.condominium)
    )
  );

CREATE POLICY expenses_select_member ON expenses FOR SELECT
  USING (
    (condominium IS NOT NULL AND is_condominium_member(condominium))
    OR (building IS NOT NULL AND EXISTS (
      SELECT 1 FROM buildings
      WHERE buildings.id = expenses.building
        AND is_condominium_member(buildings.condominium)
    ))
  );

CREATE POLICY expenses_insert_admin ON expenses FOR INSERT
  WITH CHECK (
    (condominium IS NOT NULL AND is_condominium_admin(condominium))
    OR (building IS NOT NULL AND EXISTS (
      SELECT 1 FROM buildings
      WHERE buildings.id = expenses.building
        AND is_condominium_admin(buildings.condominium)
    ))
  );

CREATE POLICY expenses_update_admin ON expenses FOR UPDATE
  USING (
    (condominium IS NOT NULL AND is_condominium_admin(condominium))
    OR (building IS NOT NULL AND EXISTS (
      SELECT 1 FROM buildings
      WHERE buildings.id = expenses.building
        AND is_condominium_admin(buildings.condominium)
    ))
  )
  WITH CHECK (
    (condominium IS NOT NULL AND is_condominium_admin(condominium))
    OR (building IS NOT NULL AND EXISTS (
      SELECT 1 FROM buildings
      WHERE buildings.id = expenses.building
        AND is_condominium_admin(buildings.condominium)
    ))
  );

CREATE POLICY expenses_delete_admin ON expenses FOR DELETE
  USING (
    (condominium IS NOT NULL AND is_condominium_admin(condominium))
    OR (building IS NOT NULL AND EXISTS (
      SELECT 1 FROM buildings
      WHERE buildings.id = expenses.building
        AND is_condominium_admin(buildings.condominium)
    ))
  );

CREATE POLICY expense_entries_select_member ON expense_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM units
      JOIN buildings ON buildings.id = units.building
      WHERE units.id = expense_entries.unit
        AND is_condominium_member(buildings.condominium)
    )
  );

CREATE POLICY expense_entries_insert_admin ON expense_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM units
      JOIN buildings ON buildings.id = units.building
      WHERE units.id = expense_entries.unit
        AND is_condominium_admin(buildings.condominium)
    )
  );

CREATE POLICY expense_entries_update_admin_or_reporter ON expense_entries FOR UPDATE
  USING (
    reported_by = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM units
      JOIN buildings ON buildings.id = units.building
      WHERE units.id = expense_entries.unit
        AND is_condominium_admin(buildings.condominium)
    )
  )
  WITH CHECK (
    reported_by = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM units
      JOIN buildings ON buildings.id = units.building
      WHERE units.id = expense_entries.unit
        AND is_condominium_admin(buildings.condominium)
    )
  );

CREATE POLICY expense_entries_delete_admin ON expense_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM units
      JOIN buildings ON buildings.id = units.building
      WHERE units.id = expense_entries.unit
        AND is_condominium_admin(buildings.condominium)
    )
  );

CREATE POLICY announcements_select_member ON announcements FOR SELECT
  USING (is_condominium_member(condominium));

CREATE POLICY announcements_insert_admin ON announcements FOR INSERT
  WITH CHECK (is_condominium_admin(condominium));

CREATE POLICY announcements_update_admin_or_author ON announcements FOR UPDATE
  USING (author = auth.uid()::text OR is_condominium_admin(condominium))
  WITH CHECK (author = auth.uid()::text OR is_condominium_admin(condominium));

CREATE POLICY announcements_delete_admin_or_author ON announcements FOR DELETE
  USING (author = auth.uid()::text OR is_condominium_admin(condominium));

CREATE POLICY payment_methods_select_member ON payment_methods FOR SELECT
  USING (is_condominium_member(condominium));

CREATE POLICY payment_methods_insert_admin ON payment_methods FOR INSERT
  WITH CHECK (is_condominium_admin(condominium));

CREATE POLICY payment_methods_update_admin ON payment_methods FOR UPDATE
  USING (is_condominium_admin(condominium))
  WITH CHECK (is_condominium_admin(condominium));

CREATE POLICY payment_methods_delete_admin ON payment_methods FOR DELETE
  USING (is_condominium_admin(condominium));

CREATE POLICY complaints_select_member ON complaints FOR SELECT
  USING (
    is_condominium_member(condominium)
    OR author = auth.uid()::text
  );

CREATE POLICY complaints_insert_resident ON complaints FOR INSERT
  WITH CHECK (is_condominium_member(condominium));

CREATE POLICY complaints_update_admin_or_author ON complaints FOR UPDATE
  USING (author = auth.uid()::text OR is_condominium_admin(condominium))
  WITH CHECK (author = auth.uid()::text OR is_condominium_admin(condominium));

CREATE POLICY complaints_delete_admin_or_author ON complaints FOR DELETE
  USING (author = auth.uid()::text OR is_condominium_admin(condominium));
