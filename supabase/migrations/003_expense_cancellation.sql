-- Migration 003: Expense cancellation, soft deletion, and payment evidence preservation
-- Run this in Supabase SQL Editor after 002_add_on_update_cascade.sql

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS delete_reason text;

CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at);

-- Allow 'cancelled' value in expense_entry_status enum if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'cancelled'
      AND enumtypid = 'expense_entry_status'::regtype
  ) THEN
    ALTER TYPE expense_entry_status ADD VALUE 'cancelled';
  END IF;
END $$;

-- Delete all unpaid entries for cancelled expenses to avoid filling the database with dead records
DELETE FROM expense_entries
WHERE expense IN (SELECT id FROM expenses WHERE status = 'cancelled')
  AND status IN ('pending', 'overdue', 'cancelled')
  AND payment_reference IS NULL
  AND payment_proof_url IS NULL
  AND paid_at IS NULL;


