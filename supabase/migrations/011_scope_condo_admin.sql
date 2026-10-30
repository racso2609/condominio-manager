-- 011_scope_condo_admin.sql
-- Building-scoped managers fix + role promotion support.
--
-- 1. is_condominium_admin() now excludes building-scoped managers.
--    Before: any verified administrator matched, so a building manager
--    (administrator with assignments) inherited FULL condominium-admin RLS
--    privileges everywhere (condominium_roles, buildings, payment_methods,
--    condominium-scoped expenses, ...). Now a condominium admin is a verified
--    administrator with NO building assignments; managers only pass
--    is_building_staff() for their assigned buildings (migration 010).
--
-- 2. Existing condominium admins are untouched: they already have
--    role='administrator' AND zero assignments, so 0 assignments = full condo.
--
-- 3. Enables promoting/demoting a member by updating the SAME
--    condominium_roles row (no duplicate rows, keeps getUserCondominiumRole
--    .single() valid). No schema change needed; RLS already allows condo
--    admins to UPDATE role/status. We only tighten is_condominium_admin here.

-- Run this in the Supabase SQL Editor after 010.

-- is_condominium_admin: verified administrator with no building scope.
CREATE OR REPLACE FUNCTION is_condominium_admin(condominium_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM condominium_roles r
    WHERE r.condominium = condominium_id
      AND r."user" = auth.uid()::text
      AND r.role = 'administrator'
      AND r.status = 'verified'
      AND NOT EXISTS (
        SELECT 1 FROM building_manager_assignments a
        WHERE a.role = r.id
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- is_condominium_member: a building manager is a verified member (unchanged
-- semantics, but re-declared here for search_path safety).
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- New helper: is the caller a verified administrator of this condominium,
-- regardless of building scope (used to gate role promotions, which a
-- condominium admin must perform; managers must not be able to promote).
CREATE OR REPLACE FUNCTION is_condominium_administrator(condominium_id text)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Role-type changes (resident <-> administrator) must be performed by a
-- condominium admin, NOT a building manager. The generic update policy already
-- allows any verified administrator to update a row, so we protect the role
-- column with a trigger: a role-type change only succeeds when the caller is a
-- full condominium admin.
--
-- Note: promoting to `administrator` with zero assignments intentionally makes
-- another whole-condominium admin; that is a legitimate condominium-admin
-- action and is allowed. Promoting with assignments makes a building manager
-- (the service inserts the assignments).
CREATE OR REPLACE FUNCTION enforce_role_change_authority()
RETURNS trigger AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT is_condominium_admin(OLD.condominium) THEN
      RAISE EXCEPTION 'Solo un administrador del condominio puede cambiar el rol de un miembro';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_role_change_authority ON condominium_roles;
CREATE TRIGGER trg_enforce_role_change_authority
  BEFORE UPDATE ON condominium_roles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_role_change_authority();
