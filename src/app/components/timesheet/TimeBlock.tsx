import { TimeEntry, Client } from '../../contexts/DataContext';
import { cn } from '../ui/utils';
import { Tooltip } from '../ui/tooltip';
import { FileCheck } from 'lucide-react';

interface TimeBlockProps {
  entry: TimeEntry;
  client?: Client;
  style: { top: number; height: number; opacity?: number; column?: number; totalColumns?: number };
  onClick: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

// Convert 24-hour time (HH:MM) to 12-hour format with AM/PM
const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const TimeBlock = ({ entry, client, style, onClick, onMouseDown }: TimeBlockProps) => {
  const timeRange = `${formatTime12Hour(entry.startTime)} - ${formatTime12Hour(entry.endTime)}`;
  const isInvoiced = entry.invoiceId !== null && entry.invoiceId !== undefined;
  
  const tooltipContent = (
    <div className="text-left max-w-xs">
      <div className="font-semibold">{client?.name || 'Unknown Client'}</div>
      <div className="mt-0.5">{entry.project}</div>
      {entry.task && <div className="text-gray-300 mt-0.5">{entry.task}</div>}
      <div className="text-gray-400 mt-1 text-xs">{timeRange}</div>
      {isInvoiced && (
        <div className="text-green-300 mt-1 text-xs flex items-center gap-1">
          <FileCheck className="w-3 h-3" />
          <span>Invoiced</span>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <div
        className={cn(
          'absolute rounded px-2 py-1 text-xs text-white cursor-pointer',
          'hover:ring-2 hover:ring-white/50 hover:shadow-lg transition-all overflow-hidden',
          'hover:z-10',
          isInvoiced && 'opacity-70' // Slightly faded if invoiced
        )}
        style={{
          top: style.top,
          height: style.height,
          backgroundColor: client?.color || '#6b7280',
          minHeight: '20px',
          opacity: isInvoiced ? 0.7 : (style.opacity || 1),
          left: '2px',
          right: '2px',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown?.(e);
        }}
      >
        {/* Invoiced indicator badge */}
        {isInvoiced && style.height > 30 && (
          <div className="absolute top-1 right-1 bg-green-500/80 rounded-full p-0.5">
            <FileCheck className="w-3 h-3" />
          </div>
        )}
        
        {/* Project name - largest and bold */}
        <div className="font-bold text-sm truncate leading-tight">{entry.project}</div>
        
        {/* Task name - medium weight, slightly smaller */}
        {entry.task && style.height > 30 && (
          <div className="font-medium text-xs truncate leading-tight mt-0.5">{entry.task}</div>
        )}
        
        {/* Time range - smallest and lightest */}
        {style.height > 50 && (
          <div className="text-white/70 text-xs mt-1 font-normal">
            {timeRange}
          </div>
        )}
      </div>
    </Tooltip>
  );
};