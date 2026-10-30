-- 010_building_managers.sql
-- Building-scoped managers ("encargados por torre").
--
-- A condominium admin (condominium_roles.role='administrator', building IS NULL)
-- keeps full access to the whole condominium. A building manager is a verified
-- administrator role with one or more rows in building_manager_assignments,
-- scoping them to those buildings only.
--
-- Run this in the Supabase SQL Editor after 009.

-- (A) Optional single-scope hint on the role row (invite context only; NOT the
--     source of authorization). Authoritative scope lives in the assignments table.
ALTER TABLE condominium_roles
  ADD COLUMN IF NOT EXISTS building text
  REFERENCES buildings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_condominium_roles_building
  ON condominium_roles(building);

-- (B) Authoritative per-building assignments. Many rows per role => many towers.
CREATE TABLE IF NOT EXISTS building_manager_assignments (
  id text PRIMARY KEY,
  role text NOT NULL REFERENCES condominium_roles(id) ON DELETE CASCADE,
  building text NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, building)
);

CREATE INDEX IF NOT EXISTS idx_bma_role ON building_manager_assignments(role);
CREATE INDEX IF NOT EXISTS idx_bma_building ON building_manager_assignments(building);

ALTER TABLE building_manager_assignments ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller a verified administrator scoped to THIS building?
CREATE OR REPLACE FUNCTION is_building_manager(building_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM building_manager_assignments a
    JOIN condominium_roles r ON r.id = a.role
    WHERE a.building = building_id
      AND r."user" = auth.uid()::text
      AND r.role = 'administrator'
      AND r.status = 'verified'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper: may the caller administer THIS building?
-- (either a whole-condominium admin, or a manager assigned to this building)
CREATE OR REPLACE FUNCTION is_building_staff(building_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM buildings b
    WHERE b.id = building_id
      AND is_condominium_admin(b.condominium)
  ) OR is_building_manager(building_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- RLS policies for building_manager_assignments
-- ============================================================================

DROP POLICY IF EXISTS bma_select_member ON building_manager_assignments;
CREATE POLICY bma_select_member ON building_manager_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM condominium_roles r
      JOIN buildings b ON b.id = building_manager_assignments.building
      WHERE r.id = building_manager_assignments.role
        AND (r."user" = auth.uid()::text OR is_condominium_admin(b.condominium))
    )
  );

DROP POLICY IF EXISTS bma_write_condo_admin ON building_manager_assignments;
CREATE POLICY bma_write_condo_admin ON building_manager_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM condominium_roles r
      JOIN buildings b ON b.id = building_manager_assignments.building
      WHERE r.id = building_manager_assignments.role
        AND is_condominium_admin(b.condominium)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM condominium_roles r
      JOIN buildings b ON b.id = building_manager_assignments.building
      WHERE r.id = building_manager_assignments.role
        AND is_condominium_admin(b.condominium)
    )
  );

-- ============================================================================
-- units: managers may manage units in their assigned buildings
-- ============================================================================

DROP POLICY IF EXISTS units_insert_admin ON units;
CREATE POLICY units_insert_admin ON units FOR INSERT
  WITH CHECK (is_building_staff(units.building));

DROP POLICY IF EXISTS units_update_admin_or_owner ON units;
CREATE POLICY units_update_admin_or_owner ON units FOR UPDATE
  USING (
    owner = auth.uid()::text
    OR is_building_staff(units.building)
  )
  WITH CHECK (
    owner = auth.uid()::text
    OR is_building_staff(units.building)
  );

DROP POLICY IF EXISTS units_delete_admin ON units;
CREATE POLICY units_delete_admin ON units FOR DELETE
  USING (is_building_staff(units.building));

-- ============================================================================
-- expenses: managers may manage BUILDING-scoped expenses in their buildings.
-- The condominium-scoped branch stays condo-admin only.
-- ============================================================================

DROP POLICY IF EXISTS expenses_insert_admin ON expenses;
CREATE POLICY expenses_insert_admin ON expenses FOR INSERT
  WITH CHECK (
    (condominium IS NOT NULL AND is_condominium_admin(condominium))
    OR (building IS NOT NULL AND is_building_staff(building))
  );

DROP POLICY IF EXISTS expenses_update_admin ON expenses;
CREATE POLICY expenses_update_admin ON expenses FOR UPDATE
  USING (
    (condominium IS NOT NULL AND is_condominium_admin(condominium))
    OR (building IS NOT NULL AND is_building_staff(building))
  )
  WITH CHECK (
    (condominium IS NOT NULL AND is_condominium_admin(condominium))
    OR (building IS NOT NULL AND is_building_staff(building))
  );

DROP POLICY IF EXISTS expenses_delete_admin ON expenses;
CREATE POLICY expenses_delete_admin ON expenses FOR DELETE
  USING (
    (condominium IS NOT NULL AND is_condominium_admin(condominium))
    OR (building IS NOT NULL AND is_building_staff(building))
  );

-- ============================================================================
-- expense_entries: managers may verify/mark paid entries in their buildings
-- ============================================================================

DROP POLICY IF EXISTS expense_entries_insert_admin ON expense_entries;
CREATE POLICY expense_entries_insert_admin ON expense_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM units
      WHERE units.id = expense_entries.unit
        AND is_building_staff(units.building)
    )
  );

DROP POLICY IF EXISTS expense_entries_update_admin_or_reporter ON expense_entries;
CREATE POLICY expense_entries_update_admin_or_reporter ON expense_entries FOR UPDATE
  USING (
    reported_by = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM units
      WHERE units.id = expense_entries.unit
        AND is_building_staff(units.building)
    )
  )
  WITH CHECK (
    reported_by = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM units
      WHERE units.id = expense_entries.unit
        AND is_building_staff(units.building)
    )
  );

DROP POLICY IF EXISTS expense_entries_delete_admin ON expense_entries;
CREATE POLICY expense_entries_delete_admin ON expense_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM units
      WHERE units.id = expense_entries.unit
        AND is_building_staff(units.building)
    )
  );

-- ============================================================================
-- announcements: managers may publish condo-wide announcements
-- ============================================================================

DROP POLICY IF EXISTS announcements_insert_admin ON announcements;
CREATE POLICY announcements_insert_admin ON announcements FOR INSERT
  WITH CHECK (
    is_condominium_admin(condominium)
    OR EXISTS (
      SELECT 1 FROM condominium_roles r
      WHERE r.condominium = announcements.condominium
        AND r."user" = auth.uid()::text
        AND r.role = 'administrator'
        AND r.status = 'verified'
        AND EXISTS (
          SELECT 1 FROM building_manager_assignments a
          WHERE a.role = r.id
        )
    )
  );

DROP POLICY IF EXISTS announcements_update_admin_or_author ON announcements;
CREATE POLICY announcements_update_admin_or_author ON announcements FOR UPDATE
  USING (
    author = auth.uid()::text
    OR is_condominium_admin(condominium)
    OR EXISTS (
      SELECT 1 FROM condominium_roles r
      WHERE r.condominium = announcements.condominium
        AND r."user" = auth.uid()::text
        AND r.role = 'administrator'
        AND r.status = 'verified'
        AND EXISTS (SELECT 1 FROM building_manager_assignments a WHERE a.role = r.id)
    )
  )
  WITH CHECK (
    author = auth.uid()::text
    OR is_condominium_admin(condominium)
    OR EXISTS (
      SELECT 1 FROM condominium_roles r
      WHERE r.condominium = announcements.condominium
        AND r."user" = auth.uid()::text
        AND r.role = 'administrator'
        AND r.status = 'verified'
        AND EXISTS (SELECT 1 FROM building_manager_assignments a WHERE a.role = r.id)
    )
  );
