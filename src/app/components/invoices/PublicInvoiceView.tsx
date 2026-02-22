import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '../ui/table';
import { Printer, FileText } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../config/supabase';

interface InvoiceData {
  invoice: {
    id: string;
    invoiceNumber: string;
    dateIssued: string;
    dueDate: string;
    total: number;
    lineItems: Array<{
      id: string;
      date: string;
      description: string;
      hours: number;
      rate: number;
      subtotal: number;
    }>;
  };
  client: {
    name: string;
    billingFirstName: string;
    billingLastName: string;
    billingEmail: string;
    billingPhone: string;
    addressStreet: string;
    addressLine2: string;
    addressCity: string;
    addressState: string;
    addressZip: string;
    addressCountry: string;
  };
  settings: {
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyEmail: string;
    companyWebsite: string;
  };
}

export const PublicInvoiceView = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-07ab6163/invoices/${id}/public`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Invoice not found');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading invoice...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600">{error || 'This invoice does not exist or has been removed.'}</p>
        </div>
      </div>
    );
  }

  const { invoice, client, settings } = data;

  return (
    <div className="min-h-screen bg-navy-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Print button - hidden when printing */}
        <div className="mb-6 print:hidden">
          <Button onClick={handlePrint} variant="outline" className="bg-white">
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
        </div>

        {/* Invoice Card - Premium Design */}
        <Card className="bg-white shadow-lg print:shadow-none overflow-hidden">
          {/* Header with Deep Navy Background */}
          <div className="bg-navy px-12 py-10">
            <div className="flex justify-between items-start">
              {/* Company Info - Left */}
              <div>
                <h1 className="text-white text-2xl font-bold mb-3">
                  {settings.companyName}
                </h1>
                {settings.companyAddress && (
                  <div className="text-white/80 text-sm whitespace-pre-line mb-1">
                    {settings.companyAddress}
                  </div>
                )}
                {settings.companyEmail && (
                  <div className="text-white/80 text-sm">{settings.companyEmail}</div>
                )}
                {settings.companyPhone && (
                  <div className="text-white/80 text-sm">{settings.companyPhone}</div>
                )}
              </div>

              {/* Invoice Info - Right */}
              <div className="text-right">
                <div className="text-white text-4xl font-bold mb-2">INVOICE</div>
                <div className="text-gold text-base font-medium">
                  {invoice.invoiceNumber}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-12 py-8">
            {/* Invoice Details and Bill To - Two Column Layout */}
            <div className="grid grid-cols-2 gap-8 mb-10">
              {/* Bill To - Left Column */}
              <div>
                <div className="text-teal font-bold text-sm mb-3">BILL TO:</div>
                <div className="text-navy text-base font-bold mb-2">{client.name}</div>
                <div className="text-gray-700 text-sm space-y-1">
                  <div>
                    {client.billingFirstName} {client.billingLastName}
                  </div>
                  {client.billingEmail && <div>{client.billingEmail}</div>}
                  {client.billingPhone && <div>{client.billingPhone}</div>}
                  {client.addressStreet && <div className="mt-2">{client.addressStreet}</div>}
                  {client.addressLine2 && <div>{client.addressLine2}</div>}
                  {client.addressCity && (
                    <div>
                      {client.addressCity}, {client.addressState} {client.addressZip}
                    </div>
                  )}
                  {client.addressCountry && <div>{client.addressCountry}</div>}
                </div>
              </div>

              {/* Invoice Details - Right Column */}
              <div className="text-right space-y-2">
                <div>
                  <div className="text-sm font-bold text-gray-700">Invoice Date:</div>
                  <div className="text-sm text-gray-900">
                    {format(parseISO(invoice.dateIssued), 'MM/dd/yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-700">Due Date:</div>
                  <div className="text-sm text-gray-900">
                    {format(parseISO(invoice.dueDate), 'MM/dd/yyyy')}
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-8">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy hover:bg-navy">
                    <TableHead className="text-white font-bold">Date</TableHead>
                    <TableHead className="text-white font-bold">Description</TableHead>
                    <TableHead className="text-white font-bold text-right">Hours</TableHead>
                    <TableHead className="text-white font-bold text-right">Rate</TableHead>
                    <TableHead className="text-white font-bold text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems.map((item, index) => (
                    <TableRow 
                      key={item.id}
                      className={index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                    >
                      <TableCell className="text-sm">
                        {format(parseISO(item.date), 'MM/dd/yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-sm text-right">{item.hours.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-right">${item.rate.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-right font-bold">
                        ${item.subtotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Total Section */}
            <div className="flex justify-end">
              <div className="w-80 border border-gray-300 rounded p-4">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="text-gray-900">${invoice.total.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between items-center">
                  <span className="text-teal text-lg font-bold">Total Due:</span>
                  <span className="text-navy text-lg font-bold">${invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-12 py-6 border-t-2 border-teal">
            <p className="text-center text-gray-600 text-sm">Thank you for your business!</p>
            {settings.companyWebsite && (
              <p className="text-center text-gray-600 text-sm mt-1">{settings.companyWebsite}</p>
            )}
            <p className="text-center text-gray-500 text-xs mt-3">
              Payment is due within 30 days. Please include invoice number with payment.
            </p>
          </div>
        </Card>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};