import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../contexts/DataContext';

interface AddTimeEntryFormProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

export const AddTimeEntryForm = ({ clientId, clientName, onClose }: AddTimeEntryFormProps) => {
  const { addTimeEntry } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    project: '',
    description: '',
  });

  const calculateHours = (start: string, end: string) => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    const hours = calculateHours(formData.startTime, formData.endTime);
    if (hours <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    setIsSubmitting(true);
    try {
      await addTimeEntry({
        clientId,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        project: formData.project,
        description: formData.description,
        hours,
      });
      toast.success('Time entry added successfully');
      onClose();
    } catch (error) {
      console.error('Error adding time entry:', error);
      toast.error('Failed to add time entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-sm text-blue-900 font-medium">
          Adding time entry for <span className="font-bold">{clientName}</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Date
        </label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Start Time
          </label>
          <Input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            End Time
          </label>
          <Input
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock className="w-4 h-4" />
          <span>
            Total: <span className="font-bold text-slate-900">
              {calculateHours(formData.startTime, formData.endTime).toFixed(2)} hours
            </span>
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Project Name
        </label>
        <Input
          type="text"
          value={formData.project}
          onChange={(e) => setFormData({ ...formData, project: e.target.value })}
          placeholder="Website Redesign"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the work performed..."
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
          required
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Time Entry'}
        </Button>
      </div>
    </form>
  );
};
