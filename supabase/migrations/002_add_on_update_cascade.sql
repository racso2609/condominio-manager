-- Add ON UPDATE CASCADE to foreign keys referencing users(id)
-- Run this in Supabase SQL Editor after 001_schema.sql and after migrating data

ALTER TABLE condominiums
  DROP CONSTRAINT IF EXISTS condominiums_creator_fkey,
  ADD CONSTRAINT condominiums_creator_fkey
    FOREIGN KEY (creator) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE condominium_roles
  DROP CONSTRAINT IF EXISTS condominium_roles_user_fkey,
  ADD CONSTRAINT condominium_roles_user_fkey
    FOREIGN KEY ("user") REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE condominium_roles
  DROP CONSTRAINT IF EXISTS condominium_roles_invited_by_fkey,
  ADD CONSTRAINT condominium_roles_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE units
  DROP CONSTRAINT IF EXISTS units_owner_fkey,
  ADD CONSTRAINT units_owner_fkey
    FOREIGN KEY (owner) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE expense_entries
  DROP CONSTRAINT IF EXISTS expense_entries_reported_by_fkey,
  ADD CONSTRAINT expense_entries_reported_by_fkey
    FOREIGN KEY (reported_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE expense_entries
  DROP CONSTRAINT IF EXISTS expense_entries_validated_by_fkey,
  ADD CONSTRAINT expense_entries_validated_by_fkey
    FOREIGN KEY (validated_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE announcements
  DROP CONSTRAINT IF EXISTS announcements_author_fkey,
  ADD CONSTRAINT announcements_author_fkey
    FOREIGN KEY (author) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE complaints
  DROP CONSTRAINT IF EXISTS complaints_author_fkey,
  ADD CONSTRAINT complaints_author_fkey
    FOREIGN KEY (author) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE complaints
  DROP CONSTRAINT IF EXISTS complaints_resolved_by_fkey,
  ADD CONSTRAINT complaints_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Update SELECT policy so a user can find their legacy record by email
DROP POLICY IF EXISTS users_select_self_or_admin ON users;
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

-- Add INSERT policy for users (needed when new users sign in)
DROP POLICY IF EXISTS users_insert_self ON users;
CREATE POLICY users_insert_self ON users FOR INSERT
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
