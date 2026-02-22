-- ================================================================
-- STEP 1: Apply the Migration
-- ================================================================
-- Run this first to add the invoice_id column to time_entries

ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice_id ON time_entries(invoice_id);

-- Create index for querying uninvoiced entries
CREATE INDEX IF NOT EXISTS idx_time_entries_uninvoiced ON time_entries(client_id, invoice_id) 
WHERE invoice_id IS NULL;

-- ================================================================
-- STEP 2: Verify the Migration
-- ================================================================
-- Run these queries to verify everything is set up correctly

-- Check that the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'time_entries' AND column_name = 'invoice_id';

-- Check that indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'time_entries' AND indexname LIKE '%invoice%';

-- ================================================================
-- STEP 3: Data Verification Queries
-- ================================================================

-- Count of uninvoiced entries per client
SELECT 
  c.name AS client_name,
  COUNT(te.id) AS uninvoiced_entries,
  SUM(te.hours) AS total_hours,
  c.hourly_rate,
  SUM(te.hours * c.hourly_rate) AS estimated_value
FROM clients c
LEFT JOIN time_entries te ON te.client_id = c.id AND te.invoice_id IS NULL
GROUP BY c.id, c.name, c.hourly_rate
ORDER BY uninvoiced_entries DESC;

-- Show which time entries are on which invoices
SELECT 
  i.invoice_number,
  c.name AS client_name,
  te.date,
  te.project,
  te.hours,
  te.description
FROM time_entries te
JOIN invoices i ON te.invoice_id = i.id
JOIN clients c ON te.client_id = c.id
ORDER BY i.invoice_number, te.date;

-- Find time entries that might have been double-invoiced
-- (This should return 0 rows if everything is working correctly)
SELECT 
  te.id,
  te.date,
  te.project,
  te.hours,
  te.invoice_id,
  COUNT(ili.id) AS line_item_count
FROM time_entries te
LEFT JOIN invoice_line_items ili ON ili.time_entry_id = te.id
GROUP BY te.id, te.date, te.project, te.hours, te.invoice_id
HAVING COUNT(ili.id) > 1;

-- ================================================================
-- STEP 4: Optional - Backfill invoice_id for existing data
-- ================================================================
-- If you have existing invoices and want to link them to time entries,
-- run this. It will attempt to match based on time_entry_id in line items.

UPDATE time_entries
SET invoice_id = ili.invoice_id
FROM invoice_line_items ili
WHERE ili.time_entry_id = time_entries.id
  AND time_entries.invoice_id IS NULL;

-- Verify the backfill
SELECT 
  COUNT(*) FILTER (WHERE invoice_id IS NULL) AS uninvoiced,
  COUNT(*) FILTER (WHERE invoice_id IS NOT NULL) AS invoiced,
  COUNT(*) AS total
FROM time_entries;

-- ================================================================
-- STEP 5: Performance Check
-- ================================================================
-- These queries should be fast with the new indexes

-- Query 1: Get uninvoiced entries for a specific client (should use index)
EXPLAIN ANALYZE
SELECT * FROM time_entries
WHERE client_id = (SELECT id FROM clients LIMIT 1)
  AND invoice_id IS NULL
ORDER BY date;

-- Query 2: Get all entries for an invoice (should use index)
EXPLAIN ANALYZE
SELECT * FROM time_entries
WHERE invoice_id = (SELECT id FROM invoices LIMIT 1);

-- ================================================================
-- STEP 6: Rollback (if needed)
-- ================================================================
-- Only run this if you need to undo the migration

-- DROP INDEX IF EXISTS idx_time_entries_invoice_id;
-- DROP INDEX IF EXISTS idx_time_entries_uninvoiced;
-- ALTER TABLE time_entries DROP COLUMN IF EXISTS invoice_id;
