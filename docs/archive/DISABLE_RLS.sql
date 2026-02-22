-- =====================================================
-- DISABLE ROW LEVEL SECURITY FOR SINGLE-USER APP
-- =====================================================
-- Run this in your Supabase SQL Editor to disable RLS
-- on all tables since we're no longer using authentication
-- =====================================================

-- Disable RLS on all tables
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;

-- Remove NOT NULL constraints on user_id columns
-- This allows the app to work without authentication
ALTER TABLE clients ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE time_entries ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE user_settings ALTER COLUMN user_id DROP NOT NULL;

-- Drop all existing RLS policies (if any)
DROP POLICY IF EXISTS "Users can view their own clients" ON clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON clients;

DROP POLICY IF EXISTS "Users can view their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can insert their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can delete their own time entries" ON time_entries;

DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;

DROP POLICY IF EXISTS "Users can view their own invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Users can insert their own invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Users can update their own invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Users can delete their own invoice line items" ON invoice_line_items;

DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;

-- Optional: Drop user_id columns completely if you want a clean schema
-- (Comment these out if you want to keep the columns for potential future use)
-- ALTER TABLE clients DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE time_entries DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS user_id;

-- Success message
SELECT 'RLS disabled and NOT NULL constraints removed! Your app should now work without authentication.' AS status;
