import type { Client, TimeEntry, Invoice, InvoiceLineItem, InvoiceEmailHistory, Payment, UserSettings } from '../types/data';

export interface SupabaseClientRow {
  id: string;
  name: string;
  billing_first_name: string;
  billing_last_name: string;
  billing_phone: string;
  billing_email: string;
  cc_emails: string[] | null;
  address_street: string;
  address_line_2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  hourly_rate: number;
  color: string;
  user_id?: string | null;
}

export interface SupabaseTimeEntryRow {
  id: string;
  client_id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  project: string;
  description: string;
  invoice_id?: string | null;
  user_id?: string | null;
}

export interface SupabaseInvoiceLineItemRow {
  id: string;
  date: string;
  description: string;
  hours: number;
  rate: number;
  subtotal: number;
  time_entry_id?: string | null;
}

export interface SupabaseInvoiceEmailHistoryRow {
  id: string;
  sent_at: string;
  sent_to: string;
  cc_emails?: string[] | null;
  custom_message?: string | null;
}

export interface SupabaseInvoiceRow {
  id: string;
  invoice_number: string;
  client_id: string;
  date_issued: string;
  due_date: string;
  status: string;
  total: number;
  last_sent_at?: string | null;
  sent_count?: number | null;
  email_history?: SupabaseInvoiceEmailHistoryRow[] | null;
  invoice_line_items?: SupabaseInvoiceLineItemRow[] | null;
  user_id?: string | null;
}

export interface SupabasePaymentRow {
  id: string;
  invoice_id: string;
  date: string;
  amount: number;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface SupabaseSettingsRow {
  user_id?: string | null;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_website: string;
  email_primary_color?: string | null;
  email_default_message?: string | null;
  email_footer?: string | null;
  email_include_pdf?: boolean | null;
  email_include_line_items?: boolean | null;
  pdf_header_color?: string | null;
  pdf_accent_color?: string | null;
  pdf_invoice_title?: string | null;
  pdf_bill_to_label?: string | null;
  pdf_date_issued_label?: string | null;
  pdf_due_date_label?: string | null;
  pdf_date_column_label?: string | null;
  pdf_description_column_label?: string | null;
  pdf_hours_column_label?: string | null;
  pdf_rate_column_label?: string | null;
  pdf_amount_column_label?: string | null;
  pdf_subtotal_label?: string | null;
  pdf_total_label?: string | null;
  pdf_footer_text?: string | null;
  pdf_terms?: string | null;
  pdf_payment_instructions?: string | null;
  pdf_show_terms?: boolean | null;
  pdf_show_payment_instructions?: boolean | null;
}

export function mapClientRow(row: SupabaseClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    billingFirstName: row.billing_first_name,
    billingLastName: row.billing_last_name,
    billingPhone: row.billing_phone,
    billingEmail: row.billing_email,
    ccEmails: row.cc_emails ?? [],
    addressStreet: row.address_street,
    addressLine2: row.address_line_2 ?? '',
    addressCity: row.address_city,
    addressState: row.address_state,
    addressZip: row.address_zip,
    addressCountry: row.address_country,
    hourlyRate: row.hourly_rate,
    color: row.color,
  };
}

export function mapTimeEntryRow(row: SupabaseTimeEntryRow): TimeEntry {
  return {
    id: row.id,
    clientId: row.client_id,
    date: row.date,
    startTime: row.start_time.substring(0, 5),
    endTime: row.end_time.substring(0, 5),
    hours: parseFloat(String(row.hours)),
    project: row.project,
    description: row.description,
    invoiceId: row.invoice_id ?? null,
  };
}

function mapInvoiceLineItemRow(item: SupabaseInvoiceLineItemRow): InvoiceLineItem {
  return {
    id: item.id,
    date: item.date,
    description: item.description,
    hours: parseFloat(String(item.hours)),
    rate: parseFloat(String(item.rate)),
    subtotal: parseFloat(String(item.subtotal)),
    timeEntryId: item.time_entry_id ?? undefined,
  };
}

export function mapEmailHistoryRow(history: SupabaseInvoiceEmailHistoryRow): InvoiceEmailHistory {
  return {
    id: history.id,
    sentAt: history.sent_at,
    sentTo: history.sent_to,
    ccEmails: history.cc_emails ?? [],
    customMessage: history.custom_message ?? undefined,
  };
}

export function mapPaymentRow(row: SupabasePaymentRow): Payment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    date: row.date,
    amount: parseFloat(String(row.amount)),
    method: row.method ?? undefined,
    reference: row.reference ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapInvoiceRow(row: SupabaseInvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientId: row.client_id,
    dateIssued: row.date_issued,
    dueDate: row.due_date,
    status: row.status as Invoice['status'],
    total: parseFloat(String(row.total)),
    lineItems: (row.invoice_line_items ?? []).map(mapInvoiceLineItemRow),
    lastSentAt: row.last_sent_at ?? undefined,
    sentCount: row.sent_count ?? undefined,
    emailHistory: (row.email_history ?? []).map(mapEmailHistoryRow),
  };
}

export function mapSettingsRow(row: SupabaseSettingsRow): UserSettings {
  return {
    companyName: row.company_name ?? '',
    companyAddress: row.company_address ?? '',
    companyPhone: row.company_phone ?? '',
    companyEmail: row.company_email ?? '',
    companyWebsite: row.company_website ?? '',
    emailPrimaryColor: row.email_primary_color ?? '#3b82f6',
    emailDefaultMessage: row.email_default_message ?? '',
    emailFooter: row.email_footer ?? '',
    emailIncludePdf: row.email_include_pdf ?? false,
    emailIncludeLineItems: row.email_include_line_items ?? false,
    pdfHeaderColor: row.pdf_header_color ?? '#0F2847',
    pdfAccentColor: row.pdf_accent_color ?? '#00a3e0',
    pdfInvoiceTitle: row.pdf_invoice_title ?? 'INVOICE',
    pdfBillToLabel: row.pdf_bill_to_label ?? 'BILL TO',
    pdfDateIssuedLabel: row.pdf_date_issued_label ?? 'Date Issued',
    pdfDueDateLabel: row.pdf_due_date_label ?? 'Due Date',
    pdfDateColumnLabel: row.pdf_date_column_label ?? 'Date',
    pdfDescriptionColumnLabel: row.pdf_description_column_label ?? 'Description',
    pdfHoursColumnLabel: row.pdf_hours_column_label ?? 'Hours',
    pdfRateColumnLabel: row.pdf_rate_column_label ?? 'Rate',
    pdfAmountColumnLabel: row.pdf_amount_column_label ?? 'Amount',
    pdfSubtotalLabel: row.pdf_subtotal_label ?? 'Subtotal',
    pdfTotalLabel: row.pdf_total_label ?? 'Total',
    pdfFooterText: row.pdf_footer_text ?? 'Thank you for your business',
    pdfTerms: row.pdf_terms ?? '',
    pdfPaymentInstructions: row.pdf_payment_instructions ?? '',
    pdfShowTerms: row.pdf_show_terms ?? false,
    pdfShowPaymentInstructions: row.pdf_show_payment_instructions ?? false,
  };
}
