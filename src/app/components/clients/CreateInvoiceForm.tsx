import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FileText, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useData, TimeEntry } from '../../contexts/DataContext';
import { format, parseISO, addDays } from 'date-fns';

interface CreateInvoiceFormProps {
  clientId: string;
  clientName: string;
  hourlyRate: number;
  onClose: () => void;
}

export const CreateInvoiceForm = ({ clientId, clientName, hourlyRate, onClose }: CreateInvoiceFormProps) => {
  const { addInvoice, timeEntries, invoices } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter unbilled time entries for this client
  const clientTimeEntries = timeEntries.filter(entry => entry.clientId === clientId);
  const billedTimeEntryIds = invoices
    .filter(inv => inv.clientId === clientId)
    .flatMap(inv => inv.lineItems.map(item => item.timeEntryId))
    .filter(Boolean);
  const unbilledEntries = clientTimeEntries.filter(entry => !billedTimeEntryIds.includes(entry.id));

  const [formData, setFormData] = useState({
    dateIssued: new Date().toISOString().split('T')[0],
    dueDate: addDays(new Date(), 30).toISOString().split('T')[0],
    status: 'draft' as 'draft' | 'sent' | 'paid' | 'overdue',
    selectedEntries: [] as string[],
  });

  const toggleEntry = (entryId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedEntries: prev.selectedEntries.includes(entryId)
        ? prev.selectedEntries.filter(id => id !== entryId)
        : [...prev.selectedEntries, entryId],
    }));
  };

  const selectedTimeEntries = unbilledEntries.filter(entry => 
    formData.selectedEntries.includes(entry.id)
  );

  const total = selectedTimeEntries.reduce((sum, entry) => sum + (entry.hours * hourlyRate), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.selectedEntries.length === 0) {
      toast.error('Please select at least one time entry');
      return;
    }

    setIsSubmitting(true);
    try {
      const lineItems = selectedTimeEntries.map(entry => ({
        id: `line-${Date.now()}-${Math.random()}`,
        date: entry.date,
        description: `${entry.project} - ${entry.description}`,
        hours: entry.hours,
        rate: hourlyRate,
        subtotal: entry.hours * hourlyRate,
        timeEntryId: entry.id,
      }));

      await addInvoice({
        clientId,
        dateIssued: formData.dateIssued,
        dueDate: formData.dueDate,
        status: formData.status,
        lineItems,
        total,
      });

      toast.success('Invoice created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-sm text-blue-900 font-medium">
          Creating invoice for <span className="font-bold">{clientName}</span> at ${hourlyRate}/hr
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date Issued
          </label>
          <Input
            type="date"
            value={formData.dateIssued}
            onChange={(e) => setFormData({ ...formData, dateIssued: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Due Date
          </label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Select Time Entries to Bill
        </label>
        {unbilledEntries.length === 0 ? (
          <div className="bg-slate-50 p-4 rounded-lg text-center text-slate-600">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p>No unbilled time entries available</p>
          </div>
        ) : (
          <div className="border border-slate-300 rounded-lg max-h-64 overflow-y-auto">
            {unbilledEntries.map((entry) => (
              <label
                key={entry.id}
                className="flex items-start gap-3 p-3 hover:bg-slate-50 border-b last:border-b-0 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.selectedEntries.includes(entry.id)}
                  onChange={() => toggleEntry(entry.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{entry.project}</p>
                    <p className="text-sm font-mono font-bold text-slate-900">
                      ${(entry.hours * hourlyRate).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">{entry.description}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span>{format(parseISO(entry.date), 'MMM d, yyyy')}</span>
                    <span>{entry.hours.toFixed(1)} hrs × ${hourlyRate}/hr</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {formData.selectedEntries.length > 0 && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-800">Selected Items</p>
              <p className="text-xs text-green-600">
                {formData.selectedEntries.length} time {formData.selectedEntries.length === 1 ? 'entry' : 'entries'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-800">Invoice Total</p>
              <p className="text-2xl font-bold text-green-900 font-mono">
                ${total.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || formData.selectedEntries.length === 0}
        >
          {isSubmitting ? 'Creating...' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
};
