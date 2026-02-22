import { useState, useEffect, useRef } from 'react';
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
import { Card } from '../ui/card';

interface TimeBlockPopupProps {
  date: string;
  startTime: string;
  endTime: string;
  position: { x: number; y: number };
  onClose: () => void;
  onSave: (data: {
    clientId: string;
    project: string;
    description: string;
    startTime: string;
    endTime: string;
  }) => void;
}

export const TimeBlockPopup = ({
  date,
  startTime: initialStartTime,
  endTime: initialEndTime,
  position,
  onClose,
  onSave,
}: TimeBlockPopupProps) => {
  const { clients } = useData();
  const [clientId, setClientId] = useState('');
  const [project, setProject] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [timeError, setTimeError] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Validate time whenever start or end time changes
  useEffect(() => {
    if (startTime && endTime) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const startMinutesTotal = startHours * 60 + startMinutes;
      const endMinutesTotal = endHours * 60 + endMinutes;
      
      if (startMinutesTotal >= endMinutesTotal) {
        setTimeError('End time must be after start time');
      } else {
        setTimeError('');
      }
    }
  }, [startTime, endTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !project || timeError) return;
    onSave({ clientId, project, description, startTime, endTime });
  };

  // Calculate popup position (try to keep it on screen)
  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 320),
    top: Math.min(position.y, window.innerHeight - 400),
    zIndex: 50,
  };

  return (
    <div ref={popupRef} style={popupStyle}>
      <Card className="w-80 p-4 shadow-lg">
        <h3 className="font-semibold text-sm mb-3">Add Time Entry</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="startTime" className="text-xs">
                Start Time
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-9"
                required
              />
            </div>
            <div>
              <Label htmlFor="endTime" className="text-xs">
                End Time
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-9"
                required
              />
            </div>
          </div>

          {timeError && (
            <div className="text-xs text-red-600 -mt-1">
              {timeError}
            </div>
          )}

          <div className="text-xs text-gray-500">
            {date}
          </div>

          <div>
            <Label htmlFor="client" className="text-xs">
              Client
            </Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="client" className="h-9">
                <SelectValue placeholder="Select client" />
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
            <Label htmlFor="project" className="text-xs">
              Project
            </Label>
            <Input
              id="project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="e.g., Website Redesign"
              className="h-9"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-xs">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              className="min-h-20 resize-none text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1" disabled={!!timeError}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};