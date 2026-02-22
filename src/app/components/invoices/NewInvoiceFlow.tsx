import { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { useData, InvoiceLineItem } from '../../contexts/DataContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Card } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Trash2, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '../ui/checkbox';

interface NewInvoiceFlowProps {
  onClose: () => void;
}

export const NewInvoiceFlow = ({ onClose }: NewInvoiceFlowProps) => {
  const { clients, getUninvoicedEntries, addInvoice } = useData();

  const [step, setStep] = useState<'select' | 'preview'>('select');
  const [clientId, setClientId] = useState('');
  const [cutoffDate, setCutoffDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateIssued, setDateIssued] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [excludedTimeEntryIds, setExcludedTimeEntryIds] = useState<Set<string>>(new Set());

  const selectedClient = clients.find((c) => c.id === clientId);
  const uninvoicedEntries = clientId ? getUninvoicedEntries(clientId, cutoffDate) : [];

  // Generate line items from uninvoiced time entries
  const generateLineItems = () => {
    if (!clientId) return;

    // Filter out excluded entries
    const entriesToInclude = uninvoicedEntries.filter(
      entry => !excludedTimeEntryIds.has(entry.id)
    );

    if (entriesToInclude.length === 0) {
      toast.error('No time entries selected. Please include at least one entry.');
      return;
    }

    const items: InvoiceLineItem[] = entriesToInclude.map((entry) => ({
      id: `line-${entry.id}`,
      date: entry.date,
      description: `${entry.project} - ${entry.description}`,
      hours: entry.hours,
      rate: selectedClient?.hourlyRate || 0,
      subtotal: entry.hours * (selectedClient?.hourlyRate || 0),
      timeEntryId: entry.id,
    }));

    setLineItems(items);
    setStep('preview');
  };

  // Toggle entry inclusion
  const toggleEntryInclusion = (entryId: string) => {
    const newExcluded = new Set(excludedTimeEntryIds);
    if (newExcluded.has(entryId)) {
      newExcluded.delete(entryId);
    } else {
      newExcluded.add(entryId);
    }
    setExcludedTimeEntryIds(newExcluded);
  };

  // Add a manual line item
  const addManualLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: `manual-${Date.now()}`,
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      hours: 1,
      rate: selectedClient?.hourlyRate || 0,
      subtotal: selectedClient?.hourlyRate || 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  // Update a line item
  const updateLineItem = (id: string, updates: Partial<InvoiceLineItem>) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          updated.subtotal = updated.hours * updated.rate;
          return updated;
        }
        return item;
      })
    );
  };

  // Remove a line item
  const removeLineItem = (id: string) => {
    setLineItems((items) => items.filter((item) => item.id !== id));
  };

  // Calculate total
  const total = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [lineItems]);

  // Calculate totals for selection step
  const includedCount = uninvoicedEntries.length - excludedTimeEntryIds.size;
  const includedHours = uninvoicedEntries
    .filter(entry => !excludedTimeEntryIds.has(entry.id))
    .reduce((sum, entry) => sum + entry.hours, 0);
  const estimatedTotal = includedHours * (selectedClient?.hourlyRate || 0);

  // Create invoice
  const handleCreateInvoice = () => {
    if (!clientId || lineItems.length === 0) {
      toast.error('Please select a client and add at least one line item');
      return;
    }

    addInvoice({
      clientId,
      dateIssued,
      dueDate,
      status: 'draft',
      lineItems,
      total,
    });

    toast.success('Invoice created successfully');
    onClose();
  };

  if (step === 'select') {
    return (
      <div className="space-y-6 py-4">
        <div>
          <Label htmlFor="client">Client</Label>
          <Select value={clientId} onValueChange={(val) => {
            setClientId(val);
            setExcludedTimeEntryIds(new Set()); // Reset exclusions when changing client
          }}>
            <SelectTrigger id="client">
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => {
                const uninvoiced = getUninvoicedEntries(client.id);
                return (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} ({uninvoiced.length} uninvoiced {uninvoiced.length === 1 ? 'entry' : 'entries'})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="cutoffDate">Include Work Through</Label>
          <Input
            id="cutoffDate"
            type="date"
            value={cutoffDate}
            onChange={(e) => setCutoffDate(e.target.value)}
          />
          <p className="text-sm text-slate-500 mt-1">
            Only uninvoiced time entries on or before this date will be included.
          </p>
        </div>

        {clientId && uninvoicedEntries.length > 0 && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Uninvoiced Time Entries</h3>
                <div className="text-sm text-slate-600">
                  {includedCount} of {uninvoicedEntries.length} selected
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-2">
                {uninvoicedEntries.map((entry) => {
                  const isIncluded = !excludedTimeEntryIds.has(entry.id);
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-3 p-3 rounded border ${
                        isIncluded ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Checkbox
                        checked={isIncluded}
                        onCheckedChange={() => toggleEntryInclusion(entry.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{format(new Date(entry.date), 'MMM d, yyyy')}</span>
                          <span className="text-slate-500">•</span>
                          <span className="font-semibold">{entry.hours}h</span>
                        </div>
                        <div className="text-sm font-medium mt-1">{entry.project}</div>
                        <div className="text-sm text-slate-600 truncate">{entry.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Hours:</span>
                  <span className="font-semibold">{includedHours.toFixed(2)}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Rate:</span>
                  <span className="font-semibold">${selectedClient?.hourlyRate || 0}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Estimated Total:</span>
                  <span className="text-lg font-bold text-teal-600">${estimatedTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {clientId && uninvoicedEntries.length === 0 && (
          <Card className="p-6 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900">No Uninvoiced Work</h4>
                <p className="text-sm text-amber-700 mt-1">
                  This client has no uninvoiced time entries. You can still create an invoice with manual line items.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateIssued">Date Issued</Label>
            <Input
              id="dateIssued"
              type="date"
              value={dateIssued}
              onChange={(e) => setDateIssued(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={generateLineItems} disabled={!clientId || includedCount === 0}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Invoice Header */}
      <Card className="p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-sm text-slate-600 mb-2">Bill To:</h3>
            <p className="font-semibold">{selectedClient?.name}</p>
            <p className="text-sm text-slate-600">{selectedClient?.billingEmail}</p>
            <p className="text-sm text-slate-600 whitespace-pre-line">
              {[
                selectedClient?.addressStreet,
                selectedClient?.addressLine2,
                [selectedClient?.addressCity, selectedClient?.addressState, selectedClient?.addressZip].filter(Boolean).join(', '),
                selectedClient?.addressCountry
              ].filter(Boolean).join('\n')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-600">Date Issued</p>
            <p className="font-semibold">{format(new Date(dateIssued), 'MMM d, yyyy')}</p>
            <p className="text-sm text-slate-600 mt-2">Due Date</p>
            <p className="font-semibold">{format(new Date(dueDate), 'MMM d, yyyy')}</p>
          </div>
        </div>
      </Card>

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Line Items</h3>
          <Button variant="outline" size="sm" onClick={addManualLineItem}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input
                      type="date"
                      value={item.date}
                      onChange={(e) => updateLineItem(item.id, { date: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.25"
                      value={item.hours}
                      onChange={(e) =>
                        updateLineItem(item.id, { hours: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8 text-sm text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) =>
                        updateLineItem(item.id, { rate: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8 text-sm text-right"
                    />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${item.subtotal.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Total */}
      <Card className="p-6">
        <div className="flex justify-end items-center gap-4">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setStep('select')}>
          Back
        </Button>
        <Button onClick={handleCreateInvoice}>Create Invoice</Button>
      </div>
    </div>
  );
};
