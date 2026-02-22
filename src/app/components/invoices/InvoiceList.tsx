import { format, isPast, parseISO } from 'date-fns';
import { useData, Invoice } from '../../contexts/DataContext';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { cn } from '../ui/utils';

interface InvoiceListProps {
  filter: 'all' | 'draft' | 'sent' | 'paid' | 'overdue';
  onSelectInvoice: (id: string) => void;
}

export const InvoiceList = ({ filter, onSelectInvoice }: InvoiceListProps) => {
  const { invoices, clients } = useData();

  // Update invoice status to overdue if past due date
  const getInvoiceStatus = (invoice: Invoice) => {
    if (invoice.status === 'paid') return 'paid';
    if (invoice.status === 'draft') return 'draft';
    
    const dueDate = parseISO(invoice.dueDate);
    if (isPast(dueDate)) {
      return 'overdue';
    }
    
    return invoice.status;
  };

  // Filter invoices based on tab
  const filteredInvoices = invoices.filter((invoice) => {
    const status = getInvoiceStatus(invoice);
    if (filter === 'all') return true;
    return status === filter;
  });

  // Sort by date issued (newest first)
  const sortedInvoices = [...filteredInvoices].sort(
    (a, b) => new Date(b.dateIssued).getTime() - new Date(a.dateIssued).getTime()
  );

  const getStatusBadge = (status: string) => {
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

  if (sortedInvoices.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-slate-600">No invoices found</p>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date Issued</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInvoices.map((invoice) => {
            const client = clients.find((c) => c.id === invoice.clientId);
            const status = getInvoiceStatus(invoice);

            return (
              <TableRow
                key={invoice.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onSelectInvoice(invoice.id)}
              >
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>{client?.name || 'Unknown'}</TableCell>
                <TableCell>{format(parseISO(invoice.dateIssued), 'MMM d, yyyy')}</TableCell>
                <TableCell
                  className={cn(
                    status === 'overdue' && 'text-red-600 font-semibold'
                  )}
                >
                  {format(parseISO(invoice.dueDate), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ${invoice.total.toFixed(2)}
                </TableCell>
                <TableCell>{getStatusBadge(status)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
};
