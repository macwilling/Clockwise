-- Migration: Add invoice_id to time_entries table
-- This migration adds tracking for which invoice (if any) a time entry has been included in.

-- Add invoice_id column to time_entries table
ALTER TABLE time_entries 
ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX idx_time_entries_invoice_id ON time_entries(invoice_id);

-- Create index for querying uninvoiced entries
CREATE INDEX idx_time_entries_uninvoiced ON time_entries(client_id, invoice_id) 
WHERE invoice_id IS NULL;

-- Migration notes:
-- 1. Existing time entries will have invoice_id = NULL (uninvoiced)
-- 2. When an invoice is created, the invoice_id is set for included time entries
-- 3. When an invoice is deleted, invoice_id is set back to NULL (ON DELETE SET NULL)
-- 4. This allows time entries to be re-invoiced if needed
