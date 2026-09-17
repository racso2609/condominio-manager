-- 003_preregister_users.sql
-- Allow offline/preregistered users and atomic preregistration with unit assignment

-- 1. Allow email to be nullable in users table
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- 2. Add columns for preregistered status, identification document and administrative notes
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS is_preregistered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS document_id text,
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. Update SELECT policy on users so condominium administrators can see all residents in their condominiums
DROP POLICY IF EXISTS users_select_self_or_admin ON users;
CREATE POLICY users_select_self_or_admin ON users FOR SELECT
  USING (
    id = auth.uid()::text
    OR (email IS NOT NULL AND email = auth.email())
    OR EXISTS (
      SELECT 1 FROM condominium_roles cr_target
      JOIN condominium_roles cr_admin ON cr_target.condominium = cr_admin.condominium
      WHERE cr_target."user" = users.id
        AND cr_admin."user" = auth.uid()::text
        AND cr_admin.role = 'administrator'
        AND cr_admin.status = 'verified'
    )
    OR EXISTS (
      SELECT 1 FROM units u
      JOIN buildings b ON b.id = u.building
      JOIN condominium_roles cr_admin ON cr_admin.condominium = b.condominium
      WHERE u.owner = users.id
        AND cr_admin."user" = auth.uid()::text
        AND cr_admin.role = 'administrator'
        AND cr_admin.status = 'verified'
    )
  );

-- 4. Allow administrators to update contact info (name, phone, document_id, notes) of preregistered users in their condominium
DROP POLICY IF EXISTS users_update_admin_preregistered ON users;
CREATE POLICY users_update_admin_preregistered ON users FOR UPDATE
  USING (
    is_preregistered = true
    AND (
      EXISTS (
        SELECT 1 FROM condominium_roles cr_target
        JOIN condominium_roles cr_admin ON cr_target.condominium = cr_admin.condominium
        WHERE cr_target."user" = users.id
          AND cr_admin."user" = auth.uid()::text
          AND cr_admin.role = 'administrator'
          AND cr_admin.status = 'verified'
      )
      OR EXISTS (
        SELECT 1 FROM units u
        JOIN buildings b ON b.id = u.building
        JOIN condominium_roles cr_admin ON cr_admin.condominium = b.condominium
        WHERE u.owner = users.id
          AND cr_admin."user" = auth.uid()::text
          AND cr_admin.role = 'administrator'
          AND cr_admin.status = 'verified'
      )
    )
  )
  WITH CHECK (
    is_preregistered = true
  );

-- 5. RPC function to preregister a resident and assign them to a unit atomically
CREATE OR REPLACE FUNCTION preregister_resident(
  p_condominium_id text,
  p_unit_id text,
  p_name text,
  p_phone text,
  p_document_id text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_new_user_id text;
  v_role_id text;
  v_now timestamptz := now();
BEGIN
  -- Verify caller is administrator of this condominium
  IF NOT is_condominium_admin(p_condominium_id) THEN
    RAISE EXCEPTION 'No tienes permisos de administrador para este condominio';
  END IF;

  -- Verify unit exists and belongs to the condominium
  IF NOT EXISTS (
    SELECT 1 FROM units u
    JOIN buildings b ON b.id = u.building
    WHERE u.id = p_unit_id AND b.condominium = p_condominium_id
  ) THEN
    RAISE EXCEPTION 'La unidad no existe o no pertenece a este condominio';
  END IF;

  -- Check if unit already has an owner
  IF EXISTS (
    SELECT 1 FROM units
    WHERE id = p_unit_id AND owner IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'La unidad ya tiene un propietario asignado';
  END IF;

  -- If email provided, check it is not already used
  IF p_email IS NOT NULL AND trim(p_email) <> '' THEN
    IF EXISTS (SELECT 1 FROM users WHERE email = trim(lower(p_email))) THEN
      RAISE EXCEPTION 'Ya existe un usuario con este correo electrónico';
    END IF;
  END IF;

  -- 1. Create preregistered user
  v_new_user_id := gen_random_uuid()::text;
  INSERT INTO users (
    id, name, email, phone, document_id, notes, is_preregistered, role, created_at, updated_at
  ) VALUES (
    v_new_user_id,
    trim(p_name),
    CASE WHEN p_email IS NOT NULL AND trim(p_email) <> '' THEN trim(lower(p_email)) ELSE NULL END,
    trim(p_phone),
    NULLIF(trim(p_document_id), ''),
    NULLIF(trim(p_notes), ''),
    true,
    'user',
    v_now,
    v_now
  );

  -- 2. Create verified resident role in condominium
  v_role_id := gen_random_uuid()::text;
  INSERT INTO condominium_roles (
    id, condominium, "user", role, status, invited_by, created_at, updated_at
  ) VALUES (
    v_role_id,
    p_condominium_id,
    v_new_user_id,
    'resident',
    'verified',
    auth.uid()::text,
    v_now,
    v_now
  );

  -- 3. Assign unit to the new resident
  UPDATE units SET
    owner = v_new_user_id,
    owner_status = 'verified',
    claim_blocked_until = NULL,
    updated_at = v_now
  WHERE id = p_unit_id;

  RETURN jsonb_build_object(
    'userId', v_new_user_id,
    'roleId', v_role_id,
    'unitId', p_unit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
