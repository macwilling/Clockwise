-- =============================================================================
-- Migration: enable_multi_tenancy.sql
-- Purpose:   Lock down the database so every row is user-scoped.
--
-- ⚠️  PREREQUISITES — complete ALL of the following before running this file:
--   1. Auth UI is working (users can log in via LoginPage.tsx).
--   2. All frontend inserts pass user_id explicitly (DataContext.tsx is updated).
--   3. Edge function JWT validation is re-enabled (getAuthenticatedUser uses
--      supabaseAuth.auth.getUser(token) — no hardcoded test user).
--   4. You have verified the app works end-to-end with a real authenticated
--      session (data loads, records insert, payments record, etc.).
--   5. You have a database backup or are running this against a dev branch.
--
-- ⚠️  THIS IS AN IRREVERSIBLE STEP for production data.
--      The permissive "Allow all" policies are dropped permanently.
--      After this runs, every Supabase query must carry a valid user JWT.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1a: Add DEFAULT auth.uid() so inserts auto-populate user_id from JWT.
--          (Safe to run even if DEFAULT is already set — no-op in that case.)
-- ---------------------------------------------------------------------------

ALTER TABLE clients       ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE time_entries  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE invoices      ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE user_settings ALTER COLUMN user_id SET DEFAULT auth.uid();

-- ---------------------------------------------------------------------------
-- STEP 1b: Backfill any existing NULL user_ids.
--          Replace <your-user-uuid> with the owner's UUID before running,
--          or delete these statements if the tables are empty / fresh setup.
-- ---------------------------------------------------------------------------

-- UPDATE clients       SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;
-- UPDATE time_entries  SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;
-- UPDATE invoices      SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;
-- UPDATE user_settings SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;

-- ---------------------------------------------------------------------------
-- STEP 1c: Add NOT NULL constraints so future inserts must always include
--          a user_id (either via DEFAULT or explicitly).
-- ---------------------------------------------------------------------------

ALTER TABLE clients       ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE time_entries  ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE invoices      ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE user_settings ALTER COLUMN user_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- STEP 1d: Drop the permissive "Allow all operations" bypass policies.
--          After this, only the user-scoped policies remain, so every query
--          must come with a valid JWT that matches the row's user_id.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all operations on clients"            ON clients;
DROP POLICY IF EXISTS "Allow all operations on invoices"           ON invoices;
DROP POLICY IF EXISTS "Allow all operations on time_entries"       ON time_entries;
DROP POLICY IF EXISTS "Allow all operations on invoice_line_items" ON invoice_line_items;
DROP POLICY IF EXISTS "Allow all operations on payments"           ON payments;

-- Verify that the user-scoped policies still exist after dropping the above:
--   SELECT policyname, tablename, cmd, qual FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
