export interface TimeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  clientId: string;
  project: string;
  description: string;
  hours: number;
  invoiceId?: string | null;
}

export interface Client {
  id: string;
  name: string;
  billingFirstName: string;
  billingLastName: string;
  billingPhone: string;
  billingEmail: string;
  ccEmails: string[];
  addressStreet: string;
  addressLine2: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  addressCountry: string;
  hourlyRate: number;
  color: string;
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

export interface InvoiceEmailHistory {
  id: string;
  sentAt: string;
  sentTo: string;
  ccEmails?: string[];
  customMessage?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  method?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  dateIssued: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'partially_paid';
  lineItems: InvoiceLineItem[];
  total: number;
  lastSentAt?: string;
  sentCount?: number;
  emailHistory?: InvoiceEmailHistory[];
  payments?: Payment[];
}

export interface UserSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  emailPrimaryColor?: string;
  emailDefaultMessage?: string;
  emailFooter?: string;
  emailIncludePdf?: boolean;
  emailIncludeLineItems?: boolean;
  pdfHeaderColor?: string;
  pdfAccentColor?: string;
  pdfInvoiceTitle?: string;
  pdfBillToLabel?: string;
  pdfDateIssuedLabel?: string;
  pdfDueDateLabel?: string;
  pdfDateColumnLabel?: string;
  pdfDescriptionColumnLabel?: string;
  pdfHoursColumnLabel?: string;
  pdfRateColumnLabel?: string;
  pdfAmountColumnLabel?: string;
  pdfSubtotalLabel?: string;
  pdfTotalLabel?: string;
  pdfFooterText?: string;
  pdfTerms?: string;
  pdfPaymentInstructions?: string;
  pdfShowTerms?: boolean;
  pdfShowPaymentInstructions?: boolean;
}

export interface DataContextType {
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
  addPayment: (invoiceId: string, payment: Omit<Payment, 'id' | 'invoiceId' | 'createdAt'>) => Promise<void>;
  deletePayment: (paymentId: string, invoiceId: string) => Promise<void>;
}
