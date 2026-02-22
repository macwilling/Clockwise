import { format, parseISO } from 'date-fns';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Pencil, Trash2 } from 'lucide-react';

interface TimesheetGridProps {
  onEditEntry: (entryId: string) => void;
}

// Convert 24-hour time (HH:MM) to 12-hour format with AM/PM
const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const TimesheetGrid = ({ onEditEntry }: TimesheetGridProps) => {
  const { timeEntries, clients, deleteTimeEntry } = useData();

  const handleDelete = (entryId: string) => {
    if (confirm('Are you sure you want to delete this time entry?')) {
      deleteTimeEntry(entryId);
    }
  };

  // Sort entries by date (most recent first)
  const sortedEntries = [...timeEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-right">Hours</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEntries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                No time entries yet. Click "Add Entry" to create your first one.
              </TableCell>
            </TableRow>
          ) : (
            sortedEntries.map((entry) => {
              const client = clients.find((c) => c.id === entry.clientId);
              const timeRange = `${formatTime12Hour(entry.startTime)} - ${formatTime12Hour(entry.endTime)}`;
              return (
                <TableRow key={entry.id}>
                  <TableCell className="text-slate-900 font-medium">
                    {format(parseISO(entry.date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: client?.color || '#3b82f6' }}
                      />
                      <span className="font-medium text-slate-900">{client?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-900">{entry.project}</TableCell>
                  <TableCell className="max-w-xs truncate text-slate-600">
                    {entry.description || '-'}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm font-mono">
                    {timeRange}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    {entry.hours.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditEntry(entry.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
};