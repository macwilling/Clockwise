-- Create payments table to track payments received against invoices
CREATE TABLE payments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_id  UUID REFERENCES invoices(id)   ON DELETE CASCADE NOT NULL,
  date        DATE        NOT NULL,
  amount      NUMERIC     NOT NULL,
  method      TEXT,       -- 'bank_transfer' | 'check' | 'paypal' | 'venmo' | 'credit_card' | 'cash' | 'other'
  reference   TEXT,       -- check number, transaction ID, memo, etc.
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payments" ON payments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_user_id    ON payments(user_id);
