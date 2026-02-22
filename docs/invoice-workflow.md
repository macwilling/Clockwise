# Invoice Workflow Documentation

## Overview

The invoicing system has been updated to follow industry best practices for time-based billing. The new workflow automatically includes all uninvoiced work when creating an invoice, while still allowing manual adjustments.

## Key Features

### 1. Automatic Uninvoiced Work Inclusion
When creating a new invoice, the system automatically:
- Shows all time entries for the selected client that haven't been invoiced yet
- Allows filtering by date (include work through a specific date)
- Displays a summary with total hours and estimated amount
- Provides checkboxes to exclude specific entries if needed

### 2. Default Client Rates with Per-Item Overrides
- Each client has a **default hourly rate** stored in their profile
- When line items are generated from time entries, they inherit the client's default rate
- Rates can be overridden on a per-line-item basis in the preview step
- This allows flexibility for special pricing or adjustments

### 3. Invoice Tracking on Time Entries
- Time entries now track which invoice (if any) they've been included in via the `invoice_id` field
- Once invoiced, entries are marked and won't appear in future "uninvoiced" lists
- If an invoice is deleted, the time entries are automatically unmarked and become available for invoicing again

## Data Schema Changes

### Time Entries Table
Added field:
- `invoice_id` (UUID, nullable) - References the invoice this entry is included in

### Clients Table
Existing field (now emphasized as default):
- `hourly_rate` (numeric) - The default hourly rate for this client

### Invoice Line Items Table
Existing field (now with override capability):
- `rate` (numeric) - The rate for this specific line item (can differ from client default)

## Workflow Steps

### Step 1: Select Client & Criteria
1. Choose a client from the dropdown (shows count of uninvoiced entries)
2. Set the "Include Work Through" date (defaults to today)
3. Review the list of uninvoiced time entries
4. Use checkboxes to exclude any entries you don't want to invoice
5. See real-time totals: hours, rate, and estimated amount
6. Set invoice issue date and due date

### Step 2: Review & Adjust Line Items
1. Review all included line items
2. Edit descriptions, hours, or rates as needed
3. Add manual line items if necessary (e.g., expenses, flat fees)
4. Remove any line items if needed
5. See the updated total
6. Create the invoice

### Step 3: Post-Creation
- Time entries are marked as invoiced (via `invoice_id`)
- They won't appear in future uninvoiced lists
- If the invoice is deleted, entries are automatically unmarked

## API Endpoints

### Get Uninvoiced Time Entries
```
GET /make-server-07ab6163/time-entries?invoiced=false&clientId={clientId}
```
Query parameters:
- `invoiced`: 'true' (invoiced only), 'false' (uninvoiced only), or omit (all)
- `clientId`: Optional filter by client

### Create Invoice
```
POST /make-server-07ab6163/invoices
```
Body includes `lineItems` array with `timeEntryId` for each entry.
The server automatically sets `invoice_id` on the referenced time entries.

### Delete Invoice
```
DELETE /make-server-07ab6163/invoices/:id
```
Automatically clears `invoice_id` from associated time entries.

## Frontend Components

### NewInvoiceFlow
The main invoice creation component with two steps:
1. **Select**: Choose client, date range, and entries to include
2. **Preview**: Review and adjust line items before creation

### DataContext
New helper function:
```typescript
getUninvoicedEntries(clientId: string, beforeDate?: string): TimeEntry[]
```
Returns uninvoiced entries for a client, optionally filtered by date.

## Benefits of This Approach

1. **Prevents Double Billing**: Entries can only be invoiced once (unless invoice is deleted)
2. **Audit Trail**: Easy to see which invoice a time entry was billed on
3. **Flexible**: Still allows manual adjustments and additions
4. **Intuitive**: Follows the natural workflow most consultants use
5. **Efficient**: Automatically includes all work, reducing manual selection

## Migration Instructions

To apply the schema changes:
1. Run the migration SQL in `/supabase/migrations/add_invoice_id_to_time_entries.sql`
2. The migration adds the `invoice_id` column and creates indexes for performance
3. Existing time entries will have `invoice_id = NULL` (uninvoiced)

## Future Enhancements

Potential improvements:
- Bulk actions: "Invoice all clients" feature
- Recurring invoices for retainer clients
- Time entry batching by project/task
- Invoice templates with saved configurations
- Multi-currency support with per-client default currency
