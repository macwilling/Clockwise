-- Enable Row Level Security (RLS) on all public tables.
-- Required because the frontend uses the anon key and queries these tables directly;
-- without RLS, any user could read or modify other users' data.
--
-- Policies restrict access to rows where user_id = auth.uid() (or, for invoice_line_items,
-- where the related invoice belongs to the current user).

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Clients
CREATE POLICY "Users can view own clients" ON public.clients FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own clients" ON public.clients FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own clients" ON public.clients FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own clients" ON public.clients FOR DELETE USING (user_id = auth.uid());

-- Time entries
CREATE POLICY "Users can view own time_entries" ON public.time_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own time_entries" ON public.time_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own time_entries" ON public.time_entries FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own time_entries" ON public.time_entries FOR DELETE USING (user_id = auth.uid());

-- Invoices
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own invoices" ON public.invoices FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own invoices" ON public.invoices FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own invoices" ON public.invoices FOR DELETE USING (user_id = auth.uid());

-- User settings
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own settings" ON public.user_settings FOR DELETE USING (user_id = auth.uid());

-- Invoice line items (access via invoice ownership)
CREATE POLICY "Users can view own invoice line items" ON public.invoice_line_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Users can insert own invoice line items" ON public.invoice_line_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Users can update own invoice line items" ON public.invoice_line_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Users can delete own invoice line items" ON public.invoice_line_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid())
);
