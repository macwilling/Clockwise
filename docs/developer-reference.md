# Developer Quick Reference - Invoice Workflow

## Key Concepts

### Invoice Tracking
- Time entries track which invoice they're on via `invoice_id`
- `invoice_id = NULL` means the entry is **uninvoiced**
- `invoice_id = <uuid>` means the entry is **invoiced**
- When an invoice is deleted, associated entries are un-invoiced (`invoice_id` set back to `NULL`)

### Rate Hierarchy
1. **Client Default Rate**: Stored in `clients.hourly_rate`
2. **Line Item Rate**: Can override default in `invoice_line_items.rate`
3. Each line item uses the client's rate initially, but can be changed per-item

---

## API Reference

### Get Time Entries (with filtering)
```http
GET /make-server-07ab6163/time-entries?invoiced=false&clientId={uuid}
```

**Query Parameters:**
- `invoiced` (optional): `'true'` | `'false'` | omit for all
- `clientId` (optional): Filter by client UUID

**Response:**
```json
{
  "entries": [
    {
      "id": "uuid",
      "clientId": "uuid",
      "date": "2024-01-15",
      "hours": 8.5,
      "project": "Website Redesign",
      "description": "Built homepage",
      "invoiceId": null  // <-- null = uninvoiced
    }
  ]
}
```

### Create Invoice (with auto-marking)
```http
POST /make-server-07ab6163/invoices
```

**Request Body:**
```json
{
  "clientId": "uuid",
  "dateIssued": "2024-01-31",
  "dueDate": "2024-02-29",
  "status": "draft",
  "total": 12600.00,
  "lineItems": [
    {
      "date": "2024-01-15",
      "description": "Website Redesign - Built homepage",
      "hours": 8.5,
      "rate": 150,
      "subtotal": 1275,
      "timeEntryId": "uuid"  // <-- References time entry
    }
  ]
}
```

**What Happens:**
1. Invoice is created
2. Line items are inserted
3. **Automatically**: `invoice_id` is set on time entries (via `timeEntryId`)
4. Those entries won't appear in future "uninvoiced" queries

### Delete Invoice (with auto-unmarking)
```http
DELETE /make-server-07ab6163/invoices/{id}
```

**What Happens:**
1. **Automatically**: `invoice_id` is cleared on associated time entries
2. Line items are deleted
3. Invoice is deleted
4. Those time entries become available for invoicing again

---

## Frontend Reference

### Get Uninvoiced Entries
```typescript
import { useData } from '../contexts/DataContext';

const { getUninvoicedEntries } = useData();

// Get all uninvoiced entries for a client
const entries = getUninvoicedEntries(clientId);

// Get uninvoiced entries up to a specific date
const entries = getUninvoicedEntries(clientId, '2024-01-31');
```

### TimeEntry Interface
```typescript
interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  clientId: string;
  project: string;
  description: string;
  hours: number;
  invoiceId?: string | null;  // <-- NEW: tracks which invoice
}
```

### InvoiceLineItem Interface
```typescript
interface InvoiceLineItem {
  id: string;
  date: string;
  description: string;
  hours: number;
  rate: number;          // <-- Can override client default
  subtotal: number;
  timeEntryId?: string;  // <-- Links to time entry
}
```

---

## Common Operations

### Check if Entry is Invoiced
```typescript
const isInvoiced = entry.invoiceId !== null;
```

### Get Invoice Number for Entry
```typescript
const invoice = invoices.find(inv => inv.id === entry.invoiceId);
const invoiceNumber = invoice?.invoiceNumber;
```

### Count Uninvoiced Hours for Client
```typescript
const uninvoicedEntries = getUninvoicedEntries(clientId);
const totalHours = uninvoicedEntries.reduce((sum, e) => sum + e.hours, 0);
```

### Estimate Uninvoiced Revenue
```typescript
const client = clients.find(c => c.id === clientId);
const uninvoicedEntries = getUninvoicedEntries(clientId);
const revenue = uninvoicedEntries.reduce(
  (sum, e) => sum + (e.hours * (client?.hourlyRate || 0)), 
  0
);
```

---

## Database Queries

### Find Uninvoiced Entries
```sql
SELECT * FROM time_entries
WHERE client_id = $1
  AND invoice_id IS NULL
ORDER BY date ASC;
```

### Get All Entries on an Invoice
```sql
SELECT te.* FROM time_entries te
WHERE te.invoice_id = $1
ORDER BY te.date;
```

### Uninvoiced Summary by Client
```sql
SELECT 
  c.name,
  COUNT(te.id) AS uninvoiced_count,
  SUM(te.hours) AS total_hours,
  SUM(te.hours * c.hourly_rate) AS estimated_value
FROM clients c
LEFT JOIN time_entries te ON te.client_id = c.id AND te.invoice_id IS NULL
GROUP BY c.id, c.name, c.hourly_rate;
```

### Check for Double-Invoicing (should return 0 rows)
```sql
SELECT te.id, COUNT(ili.id) AS invoice_count
FROM time_entries te
LEFT JOIN invoice_line_items ili ON ili.time_entry_id = te.id
GROUP BY te.id
HAVING COUNT(ili.id) > 1;
```

---

## Testing Scenarios

### Test Case 1: Normal Invoice Flow
```typescript
// 1. Get uninvoiced entries
const entries = getUninvoicedEntries(clientId);
expect(entries.length).toBeGreaterThan(0);
expect(entries[0].invoiceId).toBeNull();

// 2. Create invoice with those entries
const invoice = await addInvoice({
  clientId,
  lineItems: entries.map(e => ({
    timeEntryId: e.id,
    // ... other fields
  }))
});

// 3. Verify entries are marked
const afterEntries = getUninvoicedEntries(clientId);
expect(afterEntries.length).toBe(0);
```

### Test Case 2: Delete Invoice Un-marks Entries
```typescript
// 1. Create invoice
const invoice = await addInvoice({ /* ... */ });

// 2. Verify entries are marked
let entries = getUninvoicedEntries(clientId);
expect(entries.length).toBe(0);

// 3. Delete invoice
await deleteInvoice(invoice.id);

// 4. Verify entries are available again
entries = getUninvoicedEntries(clientId);
expect(entries.length).toBeGreaterThan(0);
```

### Test Case 3: Rate Override
```typescript
const client = clients.find(c => c.id === clientId);
const defaultRate = client.hourlyRate; // e.g., 150

// Create invoice with overridden rate
const invoice = await addInvoice({
  lineItems: [{
    hours: 5,
    rate: 200,  // Override to premium rate
    // ...
  }]
});

// Verify subtotal uses overridden rate
expect(invoice.lineItems[0].subtotal).toBe(5 * 200);
```

---

## Error Handling

### Common Issues

#### Issue: Time entry already invoiced
```typescript
// Prevention: Check before adding to line items
if (entry.invoiceId) {
  console.warn(`Entry ${entry.id} already on invoice ${entry.invoiceId}`);
  // Don't include in new invoice
}
```

#### Issue: Invoice_id not updating
```typescript
// Ensure timeEntryId is provided in line items
const lineItem = {
  timeEntryId: entry.id,  // <-- Must be present!
  // ... other fields
};
```

#### Issue: Entries not showing as uninvoiced after deletion
```typescript
// Ensure ON DELETE SET NULL is set on foreign key
// Check migration file: add_invoice_id_to_time_entries.sql
```

---

## Performance Considerations

### Indexes
Two indexes improve query performance:
1. `idx_time_entries_invoice_id` - Fast lookup of entries by invoice
2. `idx_time_entries_uninvoiced` - Fast filtering of uninvoiced entries per client

### Query Optimization
```sql
-- Good: Uses partial index
SELECT * FROM time_entries 
WHERE client_id = $1 AND invoice_id IS NULL;

-- Avoid: Full table scan
SELECT * FROM time_entries 
WHERE invoice_id IS NULL;  -- Missing client_id filter
```

---

## Debugging Tips

### Check if entry was invoiced
```sql
SELECT te.*, i.invoice_number 
FROM time_entries te
LEFT JOIN invoices i ON i.id = te.invoice_id
WHERE te.id = $1;
```

### Find orphaned invoice references
```sql
-- Time entries referencing deleted invoices
SELECT * FROM time_entries te
WHERE te.invoice_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = te.invoice_id
  );
```

### Verify line item links
```sql
-- Show which time entries are linked to which line items
SELECT 
  te.id AS entry_id,
  te.date,
  ili.id AS line_item_id,
  i.invoice_number
FROM time_entries te
LEFT JOIN invoice_line_items ili ON ili.time_entry_id = te.id
LEFT JOIN invoices i ON i.id = ili.invoice_id
WHERE te.client_id = $1;
```
