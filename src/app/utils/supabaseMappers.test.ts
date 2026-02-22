import { describe, it, expect } from 'vitest';
import {
  mapClientRow,
  mapTimeEntryRow,
  mapInvoiceRow,
  mapSettingsRow,
  mapEmailHistoryRow,
} from './supabaseMappers';

describe('supabaseMappers', () => {
  it('mapClientRow maps snake_case to camelCase', () => {
    const row = {
      id: 'id-1',
      name: 'Acme',
      billing_first_name: 'John',
      billing_last_name: 'Doe',
      billing_phone: '555-1234',
      billing_email: 'j@acme.com',
      cc_emails: ['a@b.com'],
      address_street: '123 Main',
      address_line_2: 'Suite 1',
      address_city: 'NYC',
      address_state: 'NY',
      address_zip: '10001',
      address_country: 'USA',
      hourly_rate: 100,
      color: '#333',
    };
    const client = mapClientRow(row);
    expect(client.id).toBe('id-1');
    expect(client.name).toBe('Acme');
    expect(client.billingFirstName).toBe('John');
    expect(client.addressLine2).toBe('Suite 1');
    expect(client.hourlyRate).toBe(100);
  });

  it('mapTimeEntryRow strips time to HH:MM and parses hours', () => {
    const row = {
      id: 'e-1',
      client_id: 'c-1',
      date: '2025-01-15',
      start_time: '09:30:00',
      end_time: '17:00:00',
      hours: 7.5,
      project: 'P1',
      description: 'Work',
      invoice_id: null,
    };
    const entry = mapTimeEntryRow(row);
    expect(entry.startTime).toBe('09:30');
    expect(entry.endTime).toBe('17:00');
    expect(entry.hours).toBe(7.5);
  });

  it('mapSettingsRow applies defaults for missing fields', () => {
    const row = {
      company_name: 'Co',
      company_address: '',
      company_phone: '',
      company_email: '',
      company_website: '',
    };
    const settings = mapSettingsRow(row);
    expect(settings.companyName).toBe('Co');
    expect(settings.pdfInvoiceTitle).toBe('INVOICE');
  });

  it('mapEmailHistoryRow maps history row', () => {
    const row = {
      id: 'h-1',
      sent_at: '2025-01-01T12:00:00Z',
      sent_to: 'a@b.com',
      cc_emails: [],
      custom_message: 'Thanks',
    };
    const history = mapEmailHistoryRow(row);
    expect(history.sentAt).toBe('2025-01-01T12:00:00Z');
    expect(history.sentTo).toBe('a@b.com');
    expect(history.customMessage).toBe('Thanks');
  });

  it('mapInvoiceRow maps invoice with line items', () => {
    const row = {
      id: 'inv-1',
      invoice_number: 'INV-001',
      client_id: 'c-1',
      date_issued: '2025-01-01',
      due_date: '2025-01-31',
      status: 'draft',
      total: 1000,
      last_sent_at: null,
      sent_count: null,
      email_history: null,
      invoice_line_items: [
        {
          id: 'li-1',
          date: '2025-01-01',
          description: 'Work',
          hours: 10,
          rate: 100,
          subtotal: 1000,
          time_entry_id: null,
        },
      ],
    };
    const invoice = mapInvoiceRow(row);
    expect(invoice.invoiceNumber).toBe('INV-001');
    expect(invoice.lineItems).toHaveLength(1);
    expect(invoice.lineItems[0].description).toBe('Work');
    expect(invoice.lineItems[0].subtotal).toBe(1000);
  });
});
