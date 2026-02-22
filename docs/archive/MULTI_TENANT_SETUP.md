# Multi-Tenant Database Setup Instructions

## Required Database Schema Changes

To enable multi-tenancy with Supabase auth, you need to add the following to your Supabase database through the Supabase Dashboard (SQL Editor):

### 1. Add `user_id` column to existing tables

```sql
-- Add user_id to clients table
ALTER TABLE clients 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to time_entries table  
ALTER TABLE time_entries
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to invoices table
ALTER TABLE invoices
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
```

### 2. Create `user_settings` table

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

### 3. Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients
CREATE POLICY "Users can view their own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for time_entries
CREATE POLICY "Users can view their own time entries"
  ON time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries"
  ON time_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time entries"
  ON time_entries FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for invoices
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for invoice_line_items (related to invoices through foreign key)
CREATE POLICY "Users can view line items for their invoices"
  ON invoice_line_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices 
    WHERE invoices.id = invoice_line_items.invoice_id 
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert line items for their invoices"
  ON invoice_line_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices 
    WHERE invoices.id = invoice_line_items.invoice_id 
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can update line items for their invoices"
  ON invoice_line_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM invoices 
    WHERE invoices.id = invoice_line_items.invoice_id 
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete line items for their invoices"
  ON invoice_line_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM invoices 
    WHERE invoices.id = invoice_line_items.invoice_id 
    AND invoices.user_id = auth.uid()
  ));

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);
```

### 4. Create trigger to auto-update `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## After Running These SQL Commands

Once you've run all the SQL commands in your Supabase Dashboard:

1. The app will require authentication
2. Each user will only see their own data
3. New signups will automatically create a user_settings record
4. The PDF invoice generator will use company info from user_settings

## Migration Note

If you have existing data in your tables, you'll need to either:
- Delete it and start fresh (simplest for development)
- Or manually assign a user_id to existing records

To assign existing records to a test user:
```sql
-- First create a test user through the app's signup flow, then:
UPDATE clients SET user_id = 'YOUR_USER_ID_HERE';
UPDATE time_entries SET user_id = 'YOUR_USER_ID_HERE';
UPDATE invoices SET user_id = 'YOUR_USER_ID_HERE';
```
