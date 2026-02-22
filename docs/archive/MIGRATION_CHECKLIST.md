# Database Migration Checklist

Follow these steps to apply the invoice tracking schema changes to your Supabase database.

## Prerequisites

- [ ] Access to Supabase dashboard
- [ ] Database backup (recommended)
- [ ] SQL Editor access in Supabase

## Step 1: Backup (Recommended)

Before making any schema changes:

1. Go to Supabase Dashboard → Database → Backups
2. Create a manual backup or verify automatic backups are enabled
3. Note the backup timestamp

## Step 2: Review Migration

Open and review these files:
- `/supabase/migrations/add_invoice_id_to_time_entries.sql` - The migration
- `/supabase/migrations/apply_and_verify.sql` - Migration with verification

## Step 3: Apply Migration

### Option A: Simple Migration (Recommended)

1. Open Supabase Dashboard
2. Navigate to: **SQL Editor**
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Add invoice_id column to time_entries table
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice_id ON time_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_uninvoiced ON time_entries(client_id, invoice_id) 
WHERE invoice_id IS NULL;
```

5. Click **Run**
6. Wait for "Success" message

### Option B: Full Migration with Verification

Use the comprehensive script from `/supabase/migrations/apply_and_verify.sql`:

1. Copy the **STEP 1** section (same as above)
2. Run it in SQL Editor
3. Then run **STEP 2** (verification queries)
4. Review output to confirm:
   - Column was added
   - Indexes were created

## Step 4: Verify Migration

Run these verification queries one by one:

### 4.1: Check Column Exists
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'time_entries' AND column_name = 'invoice_id';
```

**Expected Result**: One row showing:
- column_name: `invoice_id`
- data_type: `uuid`
- is_nullable: `YES`

### 4.2: Check Indexes Created
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'time_entries' AND indexname LIKE '%invoice%';
```

**Expected Result**: Two rows showing:
- `idx_time_entries_invoice_id`
- `idx_time_entries_uninvoiced`

### 4.3: Check Existing Data
```sql
SELECT 
  COUNT(*) FILTER (WHERE invoice_id IS NULL) AS uninvoiced,
  COUNT(*) FILTER (WHERE invoice_id IS NOT NULL) AS invoiced,
  COUNT(*) AS total
FROM time_entries;
```

**Expected Result**: 
- `uninvoiced`: Should equal `total` (all existing entries)
- `invoiced`: Should be 0
- `total`: Your existing time entry count

## Step 5: Optional - Backfill Existing Invoices

If you want to link existing invoices to their time entries:

```sql
UPDATE time_entries
SET invoice_id = ili.invoice_id
FROM invoice_line_items ili
WHERE ili.time_entry_id = time_entries.id
  AND time_entries.invoice_id IS NULL;
```

Then verify:
```sql
SELECT 
  COUNT(*) FILTER (WHERE invoice_id IS NULL) AS uninvoiced,
  COUNT(*) FILTER (WHERE invoice_id IS NOT NULL) AS invoiced,
  COUNT(*) AS total
FROM time_entries;
```

## Step 6: Test the Application

After migration is complete:

### Test 1: View Time Entries
- [ ] Open the app
- [ ] Go to Timesheet view
- [ ] Verify entries load correctly
- [ ] Check that no errors appear in console

### Test 2: Create New Invoice
- [ ] Go to Invoices
- [ ] Click "New Invoice"
- [ ] Select a client
- [ ] Verify uninvoiced entries appear
- [ ] Select some entries
- [ ] Create invoice
- [ ] **Expected**: Invoice created successfully

### Test 3: Verify Entry Marked
- [ ] Go back to Timesheet view
- [ ] Find the entries you just invoiced
- [ ] **Expected**: Should show "invoiced" indicator
- [ ] Hover over entry
- [ ] **Expected**: Tooltip shows "Invoiced"

### Test 4: Try Creating Another Invoice
- [ ] Go to Invoices
- [ ] Click "New Invoice"
- [ ] Select same client
- [ ] **Expected**: Previously invoiced entries don't appear

### Test 5: Delete Invoice
- [ ] Delete the invoice you just created
- [ ] **Expected**: Confirmation dialog
- [ ] Confirm deletion
- [ ] Go to New Invoice again
- [ ] **Expected**: Those entries are available again

## Step 7: Monitor for Issues

For the next 24-48 hours, monitor:
- [ ] Application logs for errors
- [ ] User reports of issues
- [ ] Database performance (should be fine with indexes)

## Rollback Plan (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_time_entries_invoice_id;
DROP INDEX IF EXISTS idx_time_entries_uninvoiced;

-- Remove column
ALTER TABLE time_entries DROP COLUMN IF EXISTS invoice_id;
```

Then restore from backup if needed.

## Common Issues & Solutions

### Issue: "Column already exists"
**Solution**: This is fine! The migration uses `IF NOT EXISTS`. Proceed to verification.

### Issue: "Foreign key violation"
**Solution**: Check that all `invoice_id` values reference valid invoices:
```sql
SELECT * FROM time_entries te
WHERE te.invoice_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id = te.invoice_id);
```
Set any orphaned references to NULL:
```sql
UPDATE time_entries
SET invoice_id = NULL
WHERE invoice_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id);
```

### Issue: "Index already exists"
**Solution**: This is fine! The migration uses `IF NOT EXISTS`. Proceed to verification.

### Issue: Performance is slow
**Solution**: Analyze the indexes:
```sql
ANALYZE time_entries;
```

## Success Criteria

Migration is successful when:
- ✅ Column `invoice_id` exists in `time_entries` table
- ✅ Two indexes created
- ✅ All existing entries have `invoice_id = NULL`
- ✅ App loads without errors
- ✅ New invoices can be created
- ✅ Time entries are marked when invoiced
- ✅ Entries become available again when invoice deleted

## Post-Migration Notes

1. **No downtime required** - Migration is non-breaking
2. **Instant rollback available** - Just drop the column
3. **Backward compatible** - Old code continues to work
4. **Forward compatible** - New code handles both old and new data

## Questions?

If you encounter issues:
1. Check the console for error messages
2. Review `/docs/developer-reference.md` for debugging tips
3. Check Supabase logs in Dashboard → Logs
4. Verify migration was applied correctly (Step 4)

---

**After completing all steps, mark this checklist as done and proceed with testing!**
