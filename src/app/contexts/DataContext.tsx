import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';

// Types
export interface TimeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  clientId: string;
  project: string;
  description: string;
  hours: number;
  invoiceId?: string | null; // ID of invoice this entry is included in, if any
}

export interface Client {
  id: string;
  name: string;
  billingFirstName: string;
  billingLastName: string;
  billingPhone: string;
  billingEmail: string;
  ccEmails: string[]; // Multiple CC emails
  addressStreet: string;
  addressLine2: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  addressCountry: string;
  hourlyRate: number;
  color: string; // hex color for calendar blocks
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  dateIssued: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  lineItems: InvoiceLineItem[];
  total: number;
  lastSentAt?: string; // ISO timestamp of last email send
  sentCount?: number; // Number of times email was sent
  emailHistory?: InvoiceEmailHistory[]; // History of all email sends
}

export interface InvoiceEmailHistory {
  id: string;
  sentAt: string; // ISO timestamp
  sentTo: string; // Primary recipient email
  ccEmails?: string[]; // CC recipients
  customMessage?: string; // Custom message included
}

export interface InvoiceLineItem {
  id: string;
  date: string;
  description: string;
  hours: number;
  rate: number;
  subtotal: number;
  timeEntryId?: string;
}

interface DataContextType {
  timeEntries: TimeEntry[];
  clients: Client[];
  invoices: Invoice[];
  settings: UserSettings | null;
  addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => void;
  updateTimeEntry: (id: string, entry: Partial<TimeEntry>) => void;
  deleteTimeEntry: (id: string) => void;
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => void;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  getUninvoicedEntries: (clientId: string, beforeDate?: string) => TimeEntry[];
}

export interface UserSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  // Email configuration
  emailPrimaryColor?: string; // Hex color for email header/accents
  emailDefaultMessage?: string; // Default message with merge fields
  emailFooter?: string; // Footer text for emails
  emailIncludePdf?: boolean; // Whether to attach PDF
  emailIncludeLineItems?: boolean; // Whether to show line items in email body
  // PDF Invoice Customization
  pdfHeaderColor?: string; // Header/primary color (default: #0F2847 - Deep Navy)
  pdfAccentColor?: string; // Accent color for highlights (default: #00a3e0 - Vibrant Teal)
  pdfInvoiceTitle?: string; // Main invoice title (default: "INVOICE")
  pdfBillToLabel?: string; // "Bill To" label (default: "BILL TO")
  pdfDateIssuedLabel?: string; // Date issued label (default: "Date Issued")
  pdfDueDateLabel?: string; // Due date label (default: "Due Date")
  pdfDateColumnLabel?: string; // Table date column (default: "Date")
  pdfDescriptionColumnLabel?: string; // Table description column (default: "Description")
  pdfHoursColumnLabel?: string; // Table hours column (default: "Hours")
  pdfRateColumnLabel?: string; // Table rate column (default: "Rate")
  pdfAmountColumnLabel?: string; // Table amount column (default: "Amount")
  pdfSubtotalLabel?: string; // Subtotal label (default: "Subtotal")
  pdfTotalLabel?: string; // Total label (default: "Total")
  pdfFooterText?: string; // Footer message (default: "Thank you for your business")
  pdfTerms?: string; // Terms and conditions text
  pdfPaymentInstructions?: string; // Payment instructions text
  pdfShowTerms?: boolean; // Whether to show terms section
  pdfShowPaymentInstructions?: boolean; // Whether to show payment instructions
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Generate sample data
const generateSampleData = () => {
  const clients: Omit<Client, 'id'>[] = [
    {
      name: 'Acme Corporation',
      billingFirstName: 'John',
      billingLastName: 'Doe',
      billingPhone: '555-1234',
      billingEmail: 'billing@acmecorp.com',
      ccEmails: ['support@acmecorp.com'],
      addressStreet: '123 Business St',
      addressLine2: '',
      addressCity: 'San Francisco',
      addressState: 'CA',
      addressZip: '94105',
      addressCountry: 'USA',
      hourlyRate: 150,
      color: '#3b82f6',
    },
    {
      name: 'TechStart Inc',
      billingFirstName: 'Jane',
      billingLastName: 'Smith',
      billingPhone: '555-5678',
      billingEmail: 'finance@techstart.io',
      ccEmails: ['support@techstart.io'],
      addressStreet: '456 Innovation Ave',
      addressLine2: '',
      addressCity: 'Austin',
      addressState: 'TX',
      addressZip: '78701',
      addressCountry: 'USA',
      hourlyRate: 175,
      color: '#8b5cf6',
    },
    {
      name: 'Global Enterprises',
      billingFirstName: 'Alice',
      billingLastName: 'Johnson',
      billingPhone: '555-8765',
      billingEmail: 'accounts@globalent.com',
      ccEmails: ['support@globalent.com'],
      addressStreet: '789 Corporate Blvd',
      addressLine2: '',
      addressCity: 'New York',
      addressState: 'NY',
      addressZip: '10001',
      addressCountry: 'USA',
      hourlyRate: 200,
      color: '#ec4899',
    },
  ];

  return { clients };
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        console.log('Loading data from Supabase...');
        
        // Fetch all data from Supabase (no auth, single-user app)
        const [clientsRes, entriesRes, invoicesRes, settingsRes] = await Promise.all([
          supabase.from('clients').select('*').order('name', { ascending: true }),
          supabase.from('time_entries').select('*').order('date', { ascending: false }),
          supabase.from('invoices').select('*, invoice_line_items(*)').order('date_issued', { ascending: false }),
          supabase.from('user_settings').select('*').limit(1).single(),
        ]);

        console.log('Supabase responses:', {
          clients: { data: clientsRes.data?.length, error: clientsRes.error },
          entries: { data: entriesRes.data?.length, error: entriesRes.error },
          invoices: { data: invoicesRes.data?.length, error: invoicesRes.error },
          settings: { data: !!settingsRes.data, error: settingsRes.error },
        });

        // Transform clients from snake_case to camelCase
        const fetchedClients = (clientsRes.data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          billingFirstName: row.billing_first_name,
          billingLastName: row.billing_last_name,
          billingPhone: row.billing_phone,
          billingEmail: row.billing_email,
          ccEmails: row.cc_emails || [],
          addressStreet: row.address_street,
          addressLine2: row.address_line_2,
          addressCity: row.address_city,
          addressState: row.address_state,
          addressZip: row.address_zip,
          addressCountry: row.address_country,
          hourlyRate: row.hourly_rate,
          color: row.color,
        }));

        // Transform time entries
        const fetchedEntries = (entriesRes.data || []).map((row: any) => ({
          id: row.id,
          clientId: row.client_id,
          date: row.date,
          startTime: row.start_time.substring(0, 5), // Strip seconds from HH:MM:SS
          endTime: row.end_time.substring(0, 5), // Strip seconds from HH:MM:SS
          hours: parseFloat(row.hours),
          project: row.project,
          description: row.description,
          invoiceId: row.invoice_id || null,
        }));

        // Transform invoices
        const fetchedInvoices = (invoicesRes.data || []).map((row: any) => ({
          id: row.id,
          invoiceNumber: row.invoice_number,
          clientId: row.client_id,
          dateIssued: row.date_issued,
          dueDate: row.due_date,
          status: row.status,
          total: parseFloat(row.total),
          lineItems: (row.invoice_line_items || []).map((item: any) => ({
            id: item.id,
            date: item.date,
            description: item.description,
            hours: parseFloat(item.hours),
            rate: parseFloat(item.rate),
            subtotal: parseFloat(item.subtotal),
            timeEntryId: item.time_entry_id,
          })),
          lastSentAt: row.last_sent_at,
          sentCount: row.sent_count,
          emailHistory: (row.email_history || []).map((history: any) => ({
            id: history.id,
            sentAt: history.sent_at,
            sentTo: history.sent_to,
            ccEmails: history.cc_emails || [],
            customMessage: history.custom_message,
          })),
        }));

        // Transform settings
        const fetchedSettings = settingsRes.data ? {
          companyName: settingsRes.data.company_name || '',
          companyAddress: settingsRes.data.company_address || '',
          companyPhone: settingsRes.data.company_phone || '',
          companyEmail: settingsRes.data.company_email || '',
          companyWebsite: settingsRes.data.company_website || '',
          emailPrimaryColor: settingsRes.data.email_primary_color || '#3b82f6',
          emailDefaultMessage: settingsRes.data.email_default_message || '',
          emailFooter: settingsRes.data.email_footer || '',
          emailIncludePdf: settingsRes.data.email_include_pdf || false,
          emailIncludeLineItems: settingsRes.data.email_include_line_items || false,
          // PDF Invoice Customization
          pdfHeaderColor: settingsRes.data.pdf_header_color || '#0F2847',
          pdfAccentColor: settingsRes.data.pdf_accent_color || '#00a3e0',
          pdfInvoiceTitle: settingsRes.data.pdf_invoice_title || 'INVOICE',
          pdfBillToLabel: settingsRes.data.pdf_bill_to_label || 'BILL TO',
          pdfDateIssuedLabel: settingsRes.data.pdf_date_issued_label || 'Date Issued',
          pdfDueDateLabel: settingsRes.data.pdf_due_date_label || 'Due Date',
          pdfDateColumnLabel: settingsRes.data.pdf_date_column_label || 'Date',
          pdfDescriptionColumnLabel: settingsRes.data.pdf_description_column_label || 'Description',
          pdfHoursColumnLabel: settingsRes.data.pdf_hours_column_label || 'Hours',
          pdfRateColumnLabel: settingsRes.data.pdf_rate_column_label || 'Rate',
          pdfAmountColumnLabel: settingsRes.data.pdf_amount_column_label || 'Amount',
          pdfSubtotalLabel: settingsRes.data.pdf_subtotal_label || 'Subtotal',
          pdfTotalLabel: settingsRes.data.pdf_total_label || 'Total',
          pdfFooterText: settingsRes.data.pdf_footer_text || 'Thank you for your business',
          pdfTerms: settingsRes.data.pdf_terms || '',
          pdfPaymentInstructions: settingsRes.data.pdf_payment_instructions || '',
          pdfShowTerms: settingsRes.data.pdf_show_terms || false,
          pdfShowPaymentInstructions: settingsRes.data.pdf_show_payment_instructions || false,
        } : null;

        console.log('Loaded data:', { 
          clients: fetchedClients.length, 
          entries: fetchedEntries.length, 
          invoices: fetchedInvoices.length,
          settings: !!fetchedSettings 
        });

        setClients(fetchedClients);
        setTimeEntries(fetchedEntries);
        setInvoices(fetchedInvoices);
        setSettings(fetchedSettings);

        // If no data exists, initialize with sample data
        if (fetchedClients.length === 0 && fetchedEntries.length === 0 && fetchedInvoices.length === 0) {
          console.log('No data found, initializing with sample clients...');
          const { clients: sampleClients } = generateSampleData();

          // Insert sample clients
          const clientsToInsert = sampleClients.map(client => ({
            name: client.name,
            billing_first_name: client.billingFirstName,
            billing_last_name: client.billingLastName,
            billing_phone: client.billingPhone,
            billing_email: client.billingEmail,
            cc_emails: client.ccEmails,
            address_street: client.addressStreet,
            address_line_2: client.addressLine2,
            address_city: client.addressCity,
            address_state: client.addressState,
            address_zip: client.addressZip,
            address_country: client.addressCountry,
            hourly_rate: client.hourlyRate,
            color: client.color,
          }));

          const { data: insertedClients, error: insertError } = await supabase
            .from('clients')
            .insert(clientsToInsert)
            .select();

          if (!insertError && insertedClients) {
            const transformedClients = insertedClients.map((row: any) => ({
              id: row.id,
              name: row.name,
              billingFirstName: row.billing_first_name,
              billingLastName: row.billing_last_name,
              billingPhone: row.billing_phone,
              billingEmail: row.billing_email,
              ccEmails: row.cc_emails || [],
              addressStreet: row.address_street,
              addressLine2: row.address_line_2,
              addressCity: row.address_city,
              addressState: row.address_state,
              addressZip: row.address_zip,
              addressCountry: row.address_country,
              hourlyRate: row.hourly_rate,
              color: row.color,
            }));
            setClients(transformedClients);
            console.log('Sample clients created:', transformedClients.length);
            toast.success('Welcome! Sample clients have been created for you.');
          }
        }

      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const addTimeEntry = async (entry: Omit<TimeEntry, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          client_id: entry.clientId,
          date: entry.date,
          start_time: entry.startTime,
          end_time: entry.endTime,
          hours: entry.hours,
          project: entry.project,
          description: entry.description,
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      const newEntry: TimeEntry = {
        id: data.id,
        clientId: data.client_id,
        date: data.date,
        startTime: data.start_time.substring(0, 5), // Strip seconds from HH:MM:SS
        endTime: data.end_time.substring(0, 5), // Strip seconds from HH:MM:SS
        hours: parseFloat(data.hours),
        project: data.project,
        description: data.description,
      };

      setTimeEntries((prev) => [newEntry, ...prev]);
      
      // Don't show toast here - let the form component handle it
    } catch (error) {
      console.error('Error adding time entry:', error);
      toast.error('Failed to add time entry');
      throw error; // Re-throw so the form knows it failed
    }
  };

  const updateTimeEntry = async (id: string, entry: Partial<TimeEntry>) => {
    try {
      const updateData: any = {};
      if (entry.clientId !== undefined) updateData.client_id = entry.clientId;
      if (entry.date !== undefined) updateData.date = entry.date;
      if (entry.startTime !== undefined) updateData.start_time = entry.startTime;
      if (entry.endTime !== undefined) updateData.end_time = entry.endTime;
      if (entry.hours !== undefined) updateData.hours = entry.hours;
      if (entry.project !== undefined) updateData.project = entry.project;
      if (entry.description !== undefined) updateData.description = entry.description;

      const { error } = await supabase
        .from('time_entries')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setTimeEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...entry } : e)));
      toast.success('Time entry updated');
    } catch (error) {
      console.error('Error updating time entry:', error);
      toast.error('Failed to update time entry');
    }
  };

  const deleteTimeEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTimeEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success('Time entry deleted');
    } catch (error) {
      console.error('Error deleting time entry:', error);
      toast.error('Failed to delete time entry');
    }
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: client.name,
          billing_first_name: client.billingFirstName,
          billing_last_name: client.billingLastName,
          billing_phone: client.billingPhone,
          billing_email: client.billingEmail,
          cc_emails: client.ccEmails,
          address_street: client.addressStreet,
          address_line_2: client.addressLine2,
          address_city: client.addressCity,
          address_state: client.addressState,
          address_zip: client.addressZip,
          address_country: client.addressCountry,
          hourly_rate: client.hourlyRate,
          color: client.color,
        }])
        .select()
        .single();

      if (error) throw error;

      const newClient: Client = {
        id: data.id,
        name: data.name,
        billingFirstName: data.billing_first_name,
        billingLastName: data.billing_last_name,
        billingPhone: data.billing_phone,
        billingEmail: data.billing_email,
        ccEmails: data.cc_emails || [],
        addressStreet: data.address_street,
        addressLine2: data.address_line_2,
        addressCity: data.address_city,
        addressState: data.address_state,
        addressZip: data.address_zip,
        addressCountry: data.address_country,
        hourlyRate: data.hourly_rate,
        color: data.color,
      };

      setClients((prev) => [...prev, newClient]);
      toast.success('Client added');
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Failed to add client');
    }
  };

  const updateClient = async (id: string, client: Partial<Client>) => {
    try {
      const updateData: any = {};
      if (client.name !== undefined) updateData.name = client.name;
      if (client.billingFirstName !== undefined) updateData.billing_first_name = client.billingFirstName;
      if (client.billingLastName !== undefined) updateData.billing_last_name = client.billingLastName;
      if (client.billingPhone !== undefined) updateData.billing_phone = client.billingPhone;
      if (client.billingEmail !== undefined) updateData.billing_email = client.billingEmail;
      if (client.ccEmails !== undefined) updateData.cc_emails = client.ccEmails;
      if (client.addressStreet !== undefined) updateData.address_street = client.addressStreet;
      if (client.addressLine2 !== undefined) updateData.address_line_2 = client.addressLine2;
      if (client.addressCity !== undefined) updateData.address_city = client.addressCity;
      if (client.addressState !== undefined) updateData.address_state = client.addressState;
      if (client.addressZip !== undefined) updateData.address_zip = client.addressZip;
      if (client.addressCountry !== undefined) updateData.address_country = client.addressCountry;
      if (client.hourlyRate !== undefined) updateData.hourly_rate = client.hourlyRate;
      if (client.color !== undefined) updateData.color = client.color;

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...client } : c)));
      toast.success('Client updated');
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client');
    }
  };

  const addInvoice = async (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => {
    try {
      // Generate invoice number by finding the highest existing number for the current year
      const currentYear = new Date().getFullYear();
      const existingInvoicesThisYear = invoices
        .filter(inv => inv.invoiceNumber.startsWith(`INV-${currentYear}-`))
        .map(inv => {
          const match = inv.invoiceNumber.match(/INV-\d{4}-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
      
      const nextNumber = existingInvoicesThisYear.length > 0 
        ? Math.max(...existingInvoicesThisYear) + 1 
        : 1;
      
      const invoiceNumber = `INV-${currentYear}-${String(nextNumber).padStart(3, '0')}`;

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          client_id: invoice.clientId,
          date_issued: invoice.dateIssued,
          due_date: invoice.dueDate,
          status: invoice.status,
          total: invoice.total,
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insert line items
      if (invoice.lineItems && invoice.lineItems.length > 0) {
        const lineItemsToInsert = invoice.lineItems.map(item => ({
          invoice_id: invoiceData.id,
          time_entry_id: item.timeEntryId || null,
          date: item.date,
          description: item.description,
          hours: item.hours,
          rate: item.rate,
          subtotal: item.subtotal,
        }));

        const { data: lineItemsData, error: lineItemsError } = await supabase
          .from('invoice_line_items')
          .insert(lineItemsToInsert)
          .select();

        if (lineItemsError) throw lineItemsError;

        const newInvoice: Invoice = {
          id: invoiceData.id,
          invoiceNumber: invoiceData.invoice_number,
          clientId: invoiceData.client_id,
          dateIssued: invoiceData.date_issued,
          dueDate: invoiceData.due_date,
          status: invoiceData.status,
          total: parseFloat(invoiceData.total),
          lineItems: lineItemsData.map(item => ({
            id: item.id,
            date: item.date,
            description: item.description,
            hours: parseFloat(item.hours),
            rate: parseFloat(item.rate),
            subtotal: parseFloat(item.subtotal),
            timeEntryId: item.time_entry_id,
          })),
          lastSentAt: invoiceData.last_sent_at,
          sentCount: invoiceData.sent_count,
          emailHistory: (invoiceData.email_history || []).map((history: any) => ({
            id: history.id,
            sentAt: history.sent_at,
            sentTo: history.sent_to,
            ccEmails: history.cc_emails || [],
            customMessage: history.custom_message,
          })),
        };

        setInvoices((prev) => [newInvoice, ...prev]);
      }

      toast.success('Invoice created');
    } catch (error) {
      console.error('Error adding invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  const updateInvoice = async (id: string, invoice: Partial<Invoice>) => {
    try {
      const updateData: any = {};
      if (invoice.invoiceNumber !== undefined) updateData.invoice_number = invoice.invoiceNumber;
      if (invoice.clientId !== undefined) updateData.client_id = invoice.clientId;
      if (invoice.dateIssued !== undefined) updateData.date_issued = invoice.dateIssued;
      if (invoice.dueDate !== undefined) updateData.due_date = invoice.dueDate;
      if (invoice.status !== undefined) updateData.status = invoice.status;
      if (invoice.total !== undefined) updateData.total = invoice.total;
      if (invoice.lastSentAt !== undefined) updateData.last_sent_at = invoice.lastSentAt;
      if (invoice.sentCount !== undefined) updateData.sent_count = invoice.sentCount;
      if (invoice.emailHistory !== undefined) {
        updateData.email_history = invoice.emailHistory.map(h => ({
          id: h.id,
          sent_at: h.sentAt,
          sent_to: h.sentTo,
          cc_emails: h.ccEmails,
          custom_message: h.customMessage,
        }));
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...invoice } : inv)));
      // Don't show toast here for email history updates
      if (!invoice.emailHistory) {
        toast.success('Invoice updated');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      // Delete line items first
      await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', id);

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      toast.success('Invoice deleted');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const updateSettings = async (settingsUpdate: Partial<UserSettings>) => {
    try {
      const updateData: any = {};
      if (settingsUpdate.companyName !== undefined) updateData.company_name = settingsUpdate.companyName;
      if (settingsUpdate.companyAddress !== undefined) updateData.company_address = settingsUpdate.companyAddress;
      if (settingsUpdate.companyPhone !== undefined) updateData.company_phone = settingsUpdate.companyPhone;
      if (settingsUpdate.companyEmail !== undefined) updateData.company_email = settingsUpdate.companyEmail;
      if (settingsUpdate.companyWebsite !== undefined) updateData.company_website = settingsUpdate.companyWebsite;
      if (settingsUpdate.emailPrimaryColor !== undefined) updateData.email_primary_color = settingsUpdate.emailPrimaryColor;
      if (settingsUpdate.emailDefaultMessage !== undefined) updateData.email_default_message = settingsUpdate.emailDefaultMessage;
      if (settingsUpdate.emailFooter !== undefined) updateData.email_footer = settingsUpdate.emailFooter;
      if (settingsUpdate.emailIncludePdf !== undefined) updateData.email_include_pdf = settingsUpdate.emailIncludePdf;
      if (settingsUpdate.emailIncludeLineItems !== undefined) updateData.email_include_line_items = settingsUpdate.emailIncludeLineItems;
      // PDF Invoice Customization
      if (settingsUpdate.pdfHeaderColor !== undefined) updateData.pdf_header_color = settingsUpdate.pdfHeaderColor;
      if (settingsUpdate.pdfAccentColor !== undefined) updateData.pdf_accent_color = settingsUpdate.pdfAccentColor;
      if (settingsUpdate.pdfInvoiceTitle !== undefined) updateData.pdf_invoice_title = settingsUpdate.pdfInvoiceTitle;
      if (settingsUpdate.pdfBillToLabel !== undefined) updateData.pdf_bill_to_label = settingsUpdate.pdfBillToLabel;
      if (settingsUpdate.pdfDateIssuedLabel !== undefined) updateData.pdf_date_issued_label = settingsUpdate.pdfDateIssuedLabel;
      if (settingsUpdate.pdfDueDateLabel !== undefined) updateData.pdf_due_date_label = settingsUpdate.pdfDueDateLabel;
      if (settingsUpdate.pdfDateColumnLabel !== undefined) updateData.pdf_date_column_label = settingsUpdate.pdfDateColumnLabel;
      if (settingsUpdate.pdfDescriptionColumnLabel !== undefined) updateData.pdf_description_column_label = settingsUpdate.pdfDescriptionColumnLabel;
      if (settingsUpdate.pdfHoursColumnLabel !== undefined) updateData.pdf_hours_column_label = settingsUpdate.pdfHoursColumnLabel;
      if (settingsUpdate.pdfRateColumnLabel !== undefined) updateData.pdf_rate_column_label = settingsUpdate.pdfRateColumnLabel;
      if (settingsUpdate.pdfAmountColumnLabel !== undefined) updateData.pdf_amount_column_label = settingsUpdate.pdfAmountColumnLabel;
      if (settingsUpdate.pdfSubtotalLabel !== undefined) updateData.pdf_subtotal_label = settingsUpdate.pdfSubtotalLabel;
      if (settingsUpdate.pdfTotalLabel !== undefined) updateData.pdf_total_label = settingsUpdate.pdfTotalLabel;
      if (settingsUpdate.pdfFooterText !== undefined) updateData.pdf_footer_text = settingsUpdate.pdfFooterText;
      if (settingsUpdate.pdfTerms !== undefined) updateData.pdf_terms = settingsUpdate.pdfTerms;
      if (settingsUpdate.pdfPaymentInstructions !== undefined) updateData.pdf_payment_instructions = settingsUpdate.pdfPaymentInstructions;
      if (settingsUpdate.pdfShowTerms !== undefined) updateData.pdf_show_terms = settingsUpdate.pdfShowTerms;
      if (settingsUpdate.pdfShowPaymentInstructions !== undefined) updateData.pdf_show_payment_instructions = settingsUpdate.pdfShowPaymentInstructions;

      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .limit(1)
        .single();

      let data;
      if (existingSettings) {
        // Update existing
        const result = await supabase
          .from('user_settings')
          .update(updateData)
          .eq('id', existingSettings.id)
          .select()
          .single();
        data = result.data;
        if (result.error) throw result.error;
      } else {
        // Insert new
        const result = await supabase
          .from('user_settings')
          .insert([updateData])
          .select()
          .single();
        data = result.data;
        if (result.error) throw result.error;
      }

      const updatedSettings: UserSettings = {
        companyName: data.company_name || '',
        companyAddress: data.company_address || '',
        companyPhone: data.company_phone || '',
        companyEmail: data.company_email || '',
        companyWebsite: data.company_website || '',
        emailPrimaryColor: data.email_primary_color || '#3b82f6',
        emailDefaultMessage: data.email_default_message || '',
        emailFooter: data.email_footer || '',
        emailIncludePdf: data.email_include_pdf || false,
        emailIncludeLineItems: data.email_include_line_items || false,
        // PDF Invoice Customization
        pdfHeaderColor: data.pdf_header_color || '#0F2847',
        pdfAccentColor: data.pdf_accent_color || '#00a3e0',
        pdfInvoiceTitle: data.pdf_invoice_title || 'INVOICE',
        pdfBillToLabel: data.pdf_bill_to_label || 'BILL TO',
        pdfDateIssuedLabel: data.pdf_date_issued_label || 'Date Issued',
        pdfDueDateLabel: data.pdf_due_date_label || 'Due Date',
        pdfDateColumnLabel: data.pdf_date_column_label || 'Date',
        pdfDescriptionColumnLabel: data.pdf_description_column_label || 'Description',
        pdfHoursColumnLabel: data.pdf_hours_column_label || 'Hours',
        pdfRateColumnLabel: data.pdf_rate_column_label || 'Rate',
        pdfAmountColumnLabel: data.pdf_amount_column_label || 'Amount',
        pdfSubtotalLabel: data.pdf_subtotal_label || 'Subtotal',
        pdfTotalLabel: data.pdf_total_label || 'Total',
        pdfFooterText: data.pdf_footer_text || 'Thank you for your business',
        pdfTerms: data.pdf_terms || '',
        pdfPaymentInstructions: data.pdf_payment_instructions || '',
        pdfShowTerms: data.pdf_show_terms || false,
        pdfShowPaymentInstructions: data.pdf_show_payment_instructions || false,
      };

      setSettings(updatedSettings);
      toast.success('Settings updated');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  // Helper to get uninvoiced time entries for a client
  const getUninvoicedEntries = (clientId: string, beforeDate?: string): TimeEntry[] => {
    let entries = timeEntries.filter(entry => 
      entry.clientId === clientId && 
      !entry.invoiceId
    );
    
    // Filter by date if provided
    if (beforeDate) {
      const cutoffDate = new Date(beforeDate);
      entries = entries.filter(entry => new Date(entry.date) <= cutoffDate);
    }
    
    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  return (
    <DataContext.Provider
      value={{
        timeEntries,
        clients,
        invoices,
        settings,
        addTimeEntry,
        updateTimeEntry,
        deleteTimeEntry,
        addClient,
        updateClient,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        updateSettings,
        getUninvoicedEntries,
      }}
    >
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      ) : (
        children
      )}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};