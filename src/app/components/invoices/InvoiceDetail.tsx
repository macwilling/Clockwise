import { format, parseISO, isPast } from 'date-fns';
import { useData } from '../../contexts/DataContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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
import { Send, Check, Download, Trash2, FileText, Mail, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../ui/utils';
import { downloadInvoicePDF } from '../../utils/generateInvoicePDF';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

interface InvoiceDetailProps {
  invoiceId: string;
  onClose: () => void;
}

export const InvoiceDetail = ({ invoiceId, onClose }: InvoiceDetailProps) => {
  const { invoices, clients, settings, updateInvoice, deleteInvoice } = useData();

  const invoice = invoices.find((inv) => inv.id === invoiceId);
  const client = invoice ? clients.find((c) => c.id === invoice.clientId) : null;

  if (!invoice || !client) {
    return <div className="p-6 text-center text-slate-600">Invoice not found</div>;
  }

  const getInvoiceStatus = () => {
    if (invoice.status === 'paid') return 'paid';
    if (invoice.status === 'draft') return 'draft';
    
    const dueDate = parseISO(invoice.dueDate);
    if (isPast(dueDate) && invoice.status !== 'paid') {
      return 'overdue';
    }
    
    return invoice.status;
  };

  const status = getInvoiceStatus();

  const handleMarkAsSent = () => {
    updateInvoice(invoiceId, { status: 'sent' });
    toast.success('Invoice marked as sent');
  };

  const handleMarkAsPaid = () => {
    updateInvoice(invoiceId, { status: 'paid' });
    toast.success('Invoice marked as paid');
  };

  const handleDownloadPDF = () => {
    if (!invoice || !client) return;

    downloadInvoicePDF({
      invoice,
      client,
      companyInfo: settings ? {
        name: settings.companyName,
        address: settings.companyAddress,
        phone: settings.companyPhone,
        email: settings.companyEmail,
        website: settings.companyWebsite,
      } : undefined,
      settings: settings,
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteInvoice(invoiceId);
      toast.success('Invoice deleted');
      onClose();
    }
  };

  const handleViewOnline = () => {
    const publicUrl = `${window.location.origin}/invoices/${invoiceId}/view`;
    window.open(publicUrl, '_blank');
  };

  const getStatusBadge = () => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      sent: { variant: 'default', label: 'Sent' },
      paid: { variant: 'outline', label: 'Paid' },
      overdue: { variant: 'destructive', label: 'Overdue' },
    };

    const config = variants[status] || variants.draft;
    return (
      <Badge variant={config.variant} className={cn(status === 'overdue' && 'bg-red-100 text-red-800 border-red-300')}>
        {config.label}
      </Badge>
    );
  };

  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendEmail = async () => {
    try {
      setSending(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-07ab6163/invoices/${invoiceId}/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ message: emailMessage }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      // Create new email history entry
      const newHistoryEntry = {
        id: crypto.randomUUID(),
        sentAt: new Date().toISOString(),
        sentTo: result.sentTo,
        ccEmails: result.cc || [],
        customMessage: emailMessage || undefined,
      };

      // Update the invoice with new history
      const updatedEmailHistory = [
        ...(invoice.emailHistory || []),
        newHistoryEntry,
      ];

      updateInvoice(invoiceId, { 
        status: 'sent',
        lastSentAt: new Date().toISOString(),
        sentCount: (invoice.sentCount || 0) + 1,
        emailHistory: updatedEmailHistory,
      });

      setIsEmailDialogOpen(false);
      setEmailMessage('');
      toast.success(`Invoice email sent successfully to ${result.sentTo}${result.cc?.length ? ` and ${result.cc.length} CC recipient(s)` : ''}`);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invoice email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h2>
          <div className="mt-2">{getStatusBadge()}</div>
        </div>
        <div className="flex gap-2">
          {status === 'draft' && (
            <Button variant="outline" size="sm" onClick={handleMarkAsSent}>
              <Send className="w-4 h-4 mr-2" />
              Mark as Sent
            </Button>
          )}
          {(status === 'sent' || status === 'overdue') && (
            <Button variant="outline" size="sm" onClick={handleMarkAsPaid}>
              <Check className="w-4 h-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEmailDialogOpen(true)}>
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewOnline}>
            <ExternalLink className="w-4 h-4 mr-2" />
            View Online
          </Button>
        </div>
      </div>

      {/* Invoice Details */}
      <Card className="p-6">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Bill To:</h3>
            <p className="font-semibold text-lg">{client.name}</p>
            <p className="text-slate-600">{client.billingEmail}</p>
            {client.ccEmails && client.ccEmails.length > 0 && (
              <p className="text-slate-500 text-sm">CC: {client.ccEmails.join(', ')}</p>
            )}
            <p className="text-slate-600 whitespace-pre-line mt-1">
              {[
                client.addressStreet,
                client.addressLine2,
                `${client.addressCity}, ${client.addressState} ${client.addressZip}`,
                client.addressCountry,
              ]
                .filter(Boolean)
                .join('\n')}
            </p>
          </div>
          <div className="text-right">
            <div className="mb-4">
              <p className="text-sm text-slate-600">Date Issued</p>
              <p className="font-semibold">
                {format(parseISO(invoice.dateIssued), 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-slate-600">Due Date</p>
              <p
                className={cn(
                  'font-semibold',
                  status === 'overdue' && 'text-red-600'
                )}
              >
                {format(parseISO(invoice.dueDate), 'MMMM d, yyyy')}
              </p>
            </div>
            {invoice.lastSentAt && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600">Last Sent</p>
                <p className="font-semibold text-sm">
                  {format(parseISO(invoice.lastSentAt), 'MMM d, yyyy h:mm a')}
                </p>
                {invoice.sentCount && invoice.sentCount > 1 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Sent {invoice.sentCount} times
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Line Items */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lineItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-slate-600">
                  {format(parseISO(item.date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{item.hours.toFixed(2)}</TableCell>
                <TableCell className="text-right">${item.rate.toFixed(2)}</TableCell>
                <TableCell className="text-right font-semibold">
                  ${item.subtotal.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="text-right font-semibold">
                Total
              </TableCell>
              <TableCell className="text-right">
                <span className="text-xl font-bold text-blue-600">
                  ${invoice.total.toFixed(2)}
                </span>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      {/* Email History */}
      {invoice.emailHistory && invoice.emailHistory.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Email History</h3>
          <div className="space-y-4">
            {invoice.emailHistory.slice().reverse().map((history) => (
              <div key={history.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-slate-900">
                        {format(parseISO(history.sentAt), 'MMMM d, yyyy')}
                      </span>
                      <span className="text-sm text-slate-500">
                        at {format(parseISO(history.sentAt), 'h:mm a')}
                      </span>
                    </div>
                    <div className="mt-2 text-sm">
                      <p className="text-slate-600">
                        <span className="font-medium">To:</span> {history.sentTo}
                      </p>
                      {history.ccEmails && history.ccEmails.length > 0 && (
                        <p className="text-slate-600">
                          <span className="font-medium">CC:</span> {history.ccEmails.join(', ')}
                        </p>
                      )}
                      {history.customMessage && (
                        <div className="mt-2 p-3 bg-slate-50 rounded-md">
                          <p className="text-xs font-medium text-slate-500 uppercase mb-1">Custom Message</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{history.customMessage}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {invoice.lastSentAt ? 'Resend' : 'Send'} Invoice via Email
            </DialogTitle>
            <DialogDescription>
              The invoice will be sent to {client.billingEmail}
              {client.ccEmails && client.ccEmails.length > 0 && ` with CC to ${client.ccEmails.join(', ')}`}.
              The PDF will be attached to the email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="emailMessage">Custom Message (Optional)</Label>
              <Textarea
                id="emailMessage"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Add a personal message to include in the email..."
                className="h-32 mt-2"
              />
              <p className="text-xs text-slate-500 mt-2">
                This message will appear in the email body alongside the invoice details.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendEmail}
              disabled={sending}
            >
              {sending ? 'Sending...' : `Send ${invoice.lastSentAt ? 'Again' : 'Now'}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};