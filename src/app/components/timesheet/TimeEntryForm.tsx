import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useData } from '../../contexts/DataContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { AlertCircle, FileCheck } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface TimeEntryFormProps {
  entryId: string | null;
  prefillData?: { date?: string; startTime?: string; endTime?: string } | null;
  onClose: () => void;
  onSuccess?: (entryDate: string) => void;
}

export const TimeEntryForm = ({ entryId, prefillData, onClose, onSuccess }: TimeEntryFormProps) => {
  const { timeEntries, clients, invoices, addTimeEntry, updateTimeEntry, deleteTimeEntry } = useData();

  const existingEntry = entryId ? timeEntries.find((e) => e.id === entryId) : null;
  const isInvoiced = existingEntry?.invoiceId !== null && existingEntry?.invoiceId !== undefined;
  const invoiceNumber = isInvoiced 
    ? invoices.find(inv => inv.id === existingEntry?.invoiceId)?.invoiceNumber 
    : null;

  const [date, setDate] = useState(
    existingEntry?.date || prefillData?.date || format(new Date(), 'yyyy-MM-dd')
  );
  const [startTime, setStartTime] = useState(
    existingEntry?.startTime || prefillData?.startTime || '09:00'
  );
  const [endTime, setEndTime] = useState(
    existingEntry?.endTime || prefillData?.endTime || '17:00'
  );
  const [clientId, setClientId] = useState(existingEntry?.clientId || '');
  const [project, setProject] = useState(existingEntry?.project || '');
  const [description, setDescription] = useState(existingEntry?.description || '');

  // Auto-select first client if available and no existing entry
  useEffect(() => {
    if (clients.length > 0 && !clientId && !existingEntry) {
      setClientId(clients[0].id);
    }
  }, [clients, clientId, existingEntry]);

  const calculateHours = (start: string, end: string) => {
    const [startHours, startMinutes] = start.split(':').map(Number);
    const [endHours, endMinutes] = end.split(':').map(Number);
    return (endHours * 60 + endMinutes - (startHours * 60 + startMinutes)) / 60;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId || !project) {
      toast.error('Please fill in all required fields');
      return;
    }

    const hours = calculateHours(startTime, endTime);
    if (hours <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      if (entryId) {
        await updateTimeEntry(entryId, {
          date,
          startTime,
          endTime,
          clientId,
          project,
          description,
          hours,
        });
        toast.success('Time entry updated');
      } else {
        await addTimeEntry({
          date,
          startTime,
          endTime,
          clientId,
          project,
          description,
          hours,
        });
        toast.success('Time entry added');
      }

      if (onSuccess) {
        onSuccess(date);
      } else {
        onClose();
      }
    } catch (error) {
      // Error toast already shown in context
      console.error('Error in handleSubmit:', error);
    }
  };

  const handleDelete = () => {
    if (entryId && confirm('Are you sure you want to delete this time entry?')) {
      deleteTimeEntry(entryId);
      toast.success('Time entry deleted');
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      {isInvoiced && (
        <Alert className="border-amber-200 bg-amber-50">
          <FileCheck className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            This entry has been invoiced{invoiceNumber && ` (Invoice #${invoiceNumber})`}. 
            Changes may affect your billing records.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="client">Client</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger id="client">
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="project">Project / Task</Label>
        <Input
          id="project"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="e.g., Website Redesign"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you work on?"
          className="min-h-24 resize-none"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          {entryId ? 'Update' : 'Add'} Entry
        </Button>
        {entryId && (
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
};