import { format, isSameDay } from 'date-fns';
import { useData } from '../../contexts/DataContext';
import { useRef, useState, useEffect } from 'react';
import { TimeEntry } from '../../contexts/DataContext';
import { cn } from '../ui/utils';
import React from 'react';

interface WeeklyCalendarProps {
  weekDays: Date[];
  onEditEntry: (entryId: string) => void;
  onNewEntry: (data: { date: string; startTime: string; endTime: string }) => void;
  timeRange: { start: number; end: number };
  onTimeRangeChange: (range: { start: number; end: number }) => void;
}

const HOUR_HEIGHT = 60; // pixels per hour

export const WeeklyCalendar = ({ weekDays, onEditEntry, onNewEntry, timeRange, onTimeRangeChange }: WeeklyCalendarProps) => {
  const { timeEntries, clients, updateTimeEntry } = useData();
  const [dragging, setDragging] = useState<{
    dayIndex: number;
    startY: number;
    currentY: number;
  } | null>(null);
  const [draggedEntry, setDraggedEntry] = useState<{
    entry: TimeEntry;
    offsetY: number;
    previewDayIndex: number;
    previewY: number;
  } | null>(null);
  const [justDragged, setJustDragged] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Generate hours array based on selected range
  const HOURS = Array.from({ length: timeRange.end - timeRange.start }, (_, i) => i + timeRange.start);

  // Get entries for a specific day
  const getEntriesForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return timeEntries.filter((entry) => entry.date === dayStr);
  };

  // Convert Y position to time (accounting for offset)
  const yToTime = (y: number) => {
    const totalMinutes = (y / HOUR_HEIGHT) * 60;
    const snappedMinutes = Math.round(totalMinutes / 15) * 15;
    const hours = Math.floor(snappedMinutes / 60) + timeRange.start;
    const minutes = snappedMinutes % 60;
    return { hours: Math.max(timeRange.start, Math.min(timeRange.end - 1, hours)), minutes: Math.min(59, minutes) };
  };

  // Convert time to Y position (accounting for offset)
  const timeToY = (hours: number, minutes: number) => {
    return (hours - timeRange.start) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
  };

  // Snap Y position to 15-minute increments
  const snapYToGrid = (y: number) => {
    const time = yToTime(y);
    return timeToY(time.hours, time.minutes);
  };

  // Handle mouse down to start dragging
  const handleMouseDown = (e: React.MouseEvent, dayIndex: number) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    const y = snapYToGrid(e.clientY - rect.top);
    setDragging({ dayIndex, startY: y, currentY: y });
  };

  // Handle dragging an existing time entry
  const handleEntryMouseDown = (e: React.MouseEvent, entry: TimeEntry, dayIndex: number) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    
    const style = getBlockStyle(entry);
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    
    setDraggedEntry({ entry, offsetY, previewDayIndex: dayIndex, previewY: style.top });
  };

  // Handle mouse move while dragging an entry
  useEffect(() => {
    if (!draggedEntry) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dayColumns = document.querySelectorAll('[data-day-column]');
      let targetDayIndex = -1;
      
      dayColumns.forEach((col, idx) => {
        const rect = col.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          targetDayIndex = idx;
        }
      });

      if (targetDayIndex === -1) return;

      const dayContent = document.querySelector(`[data-day-index="${targetDayIndex}"]`) as HTMLElement;
      if (!dayContent) return;

      const rect = dayContent.getBoundingClientRect();
      const y = e.clientY - rect.top - draggedEntry.offsetY;
      const snappedY = snapYToGrid(y);

      setDraggedEntry((prev) => prev ? {
        ...prev,
        previewDayIndex: targetDayIndex,
        previewY: snappedY,
      } : null);

      document.body.style.cursor = 'grabbing';
    };

    const handleMouseUp = async (e: MouseEvent) => {
      if (!draggedEntry) return;

      const dayColumns = document.querySelectorAll('[data-day-column]');
      let targetDayIndex = -1;
      
      dayColumns.forEach((col, idx) => {
        const rect = col.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          targetDayIndex = idx;
        }
      });

      if (targetDayIndex >= 0) {
        const dayContent = document.querySelector(`[data-day-index="${targetDayIndex}"]`) as HTMLElement;
        if (dayContent) {
          const rect = dayContent.getBoundingClientRect();
          const y = e.clientY - rect.top - draggedEntry.offsetY;
          const snappedY = snapYToGrid(y);

          const [origStartHours, origStartMinutes] = draggedEntry.entry.startTime.split(':').map(Number);
          const [origEndHours, origEndMinutes] = draggedEntry.entry.endTime.split(':').map(Number);
          const durationMinutes = (origEndHours * 60 + origEndMinutes) - (origStartHours * 60 + origStartMinutes);

          const newStartTime = yToTime(snappedY);
          const newStartMinutes = newStartTime.hours * 60 + newStartTime.minutes;
          const newEndMinutes = newStartMinutes + durationMinutes;
          const newEndHours = Math.floor(newEndMinutes / 60);
          const newEndMins = newEndMinutes % 60;

          const newDate = format(weekDays[targetDayIndex], 'yyyy-MM-dd');
          const startTimeStr = `${String(newStartTime.hours).padStart(2, '0')}:${String(newStartTime.minutes).padStart(2, '0')}`;
          const endTimeStr = `${String(newEndHours).padStart(2, '0')}:${String(newEndMins).padStart(2, '0')}`;

          await updateTimeEntry(draggedEntry.entry.id, {
            date: newDate,
            startTime: startTimeStr,
            endTime: endTimeStr,
          });
        }
      }

      document.body.style.cursor = '';
      setDraggedEntry(null);
      setJustDragged(true);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [draggedEntry, weekDays, updateTimeEntry]);

  // Calculate position and height for time entries
  const getBlockStyle = (entry: TimeEntry) => {
    const [startHours, startMinutes] = entry.startTime.split(':').map(Number);
    const [endHours, endMinutes] = entry.endTime.split(':').map(Number);

    const top = timeToY(startHours, startMinutes);
    const bottom = timeToY(endHours, endMinutes);
    const height = bottom - top;

    return { top, height };
  };

  // Calculate dragging rectangle
  const getDraggingStyle = () => {
    if (!dragging) return null;

    const top = Math.min(dragging.startY, dragging.currentY);
    const height = Math.abs(dragging.currentY - dragging.startY);

    return { top, height };
  };

  const draggingStyle = getDraggingStyle();

  // Handle mouse move during drag to create new entry
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dayContent = document.querySelector(`[data-day-index="${dragging.dayIndex}"]`) as HTMLElement;
      if (!dayContent) return;

      const rect = dayContent.getBoundingClientRect();
      const y = snapYToGrid(e.clientY - rect.top);
      
      setDragging((prev) => prev ? { ...prev, currentY: y } : null);
    };

    const handleMouseUp = () => {
      if (!dragging || !draggingStyle) {
        setDragging(null);
        return;
      }

      // Only create entry if there's meaningful height (at least 15 minutes)
      if (draggingStyle.height >= HOUR_HEIGHT / 4) {
        const startTime = yToTime(draggingStyle.top);
        const endTime = yToTime(draggingStyle.top + draggingStyle.height);
        
        const date = format(weekDays[dragging.dayIndex], 'yyyy-MM-dd');
        const startTimeStr = `${String(startTime.hours).padStart(2, '0')}:${String(startTime.minutes).padStart(2, '0')}`;
        const endTimeStr = `${String(endTime.hours).padStart(2, '0')}:${String(endTime.minutes).padStart(2, '0')}`;
        
        onNewEntry({ date, startTime: startTimeStr, endTime: endTimeStr });
      }
      
      setDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, weekDays, onNewEntry, draggingStyle]);

  // Convert 24-hour time to 12-hour format
  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="relative" ref={calendarRef}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="grid grid-cols-8 border-l border-gray-200">
          {/* Time labels column - header */}
          <div className="border-r border-gray-200 bg-white sticky top-0 z-20">
            <div className="h-12 border-b border-gray-200 bg-white" />
          </div>

          {/* Day headers */}
          {weekDays.map((day, dayIndex) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div 
                key={`header-${dayIndex}`}
                className={cn(
                  'h-12 border-b border-r border-gray-200 flex flex-col items-center justify-center bg-white sticky top-0 z-20',
                  isToday && 'bg-blue-50'
                )}
              >
                <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
                <div
                  className={cn(
                    'text-sm font-semibold',
                    isToday ? 'text-blue-600' : 'text-gray-900'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable content area */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          <div className="grid grid-cols-8 border-l border-gray-200">
            {/* Time labels column */}
            <div className="border-r border-gray-200 sticky left-0 bg-white z-10">
              <div className="relative" style={{ height: HOUR_HEIGHT * HOURS.length }}>
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full text-xs text-gray-500 text-right pr-2"
                    style={{ top: (hour - timeRange.start) * HOUR_HEIGHT - 8 }}
                  >
                    {format(new Date().setHours(hour, 0, 0, 0), 'ha')}
                  </div>
                ))}
              </div>
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => {
              const entries = getEntriesForDay(day);

              return (
                <div key={dayIndex} className="border-r border-gray-200" data-day-column>
                  <div
                    className="relative cursor-crosshair hover:bg-gray-50/50 select-none"
                    style={{ height: HOUR_HEIGHT * HOURS.length }}
                    onMouseDown={(e) => handleMouseDown(e, dayIndex)}
                    data-day-content
                    data-day-index={dayIndex}
                  >
                    {/* Hour lines */}
                    {HOURS.map((hour, idx) => (
                      <div
                        key={hour}
                        className="absolute w-full border-t border-gray-100"
                        style={{ top: idx * HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Time entries */}
                    {entries.map((entry) => {
                      const client = clients.find((c) => c.id === entry.clientId);
                      const style = getBlockStyle(entry);
                      const isDragging = draggedEntry?.entry.id === entry.id;
                      const timeRange = `${formatTime12Hour(entry.startTime)} - ${formatTime12Hour(entry.endTime)}`;
                      
                      // Calculate duration
                      const [startHours, startMinutes] = entry.startTime.split(':').map(Number);
                      const [endHours, endMinutes] = entry.endTime.split(':').map(Number);
                      const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
                      const durationHours = Math.floor(durationMinutes / 60);
                      const durationMins = durationMinutes % 60;
                      const durationText = durationHours > 0 
                        ? `${durationHours}h${durationMins > 0 ? ` ${durationMins}m` : ''}`
                        : `${durationMins}m`;
                      
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            'absolute left-1 right-1 rounded px-2.5 py-2 text-white cursor-pointer',
                            'hover:shadow-lg hover:brightness-110 transition-all overflow-hidden',
                            isDragging && 'opacity-30'
                          )}
                          style={{
                            top: style.top,
                            height: style.height,
                            backgroundColor: client?.color || '#6b7280',
                            minHeight: '20px',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Prevent click if we just dragged
                            if (justDragged) {
                              setJustDragged(false);
                              return;
                            }
                            onEditEntry(entry.id);
                          }}
                          onMouseDown={(e) => handleEntryMouseDown(e, entry, dayIndex)}
                        >
                          {/* Very small blocks - just project name */}
                          {style.height < 40 && (
                            <div className="font-medium text-xs truncate">{entry.project}</div>
                          )}
                          
                          {/* Small blocks - project + time */}
                          {style.height >= 40 && style.height < 70 && (
                            <div>
                              <div className="font-medium text-xs truncate leading-tight">
                                {entry.project}
                              </div>
                              <div className="text-[10px] opacity-75 mt-0.5">
                                {timeRange}
                              </div>
                            </div>
                          )}
                          
                          {/* Medium blocks - add client name */}
                          {style.height >= 70 && style.height < 100 && (
                            <div>
                              <div className="text-[10px] opacity-70 truncate uppercase tracking-wide font-medium mb-0.5">
                                {client?.name || 'No Client'}
                              </div>
                              <div className="font-medium text-xs truncate leading-tight">
                                {entry.project}
                              </div>
                              <div className="text-[10px] opacity-75 mt-1">
                                {timeRange}
                              </div>
                            </div>
                          )}
                          
                          {/* Large blocks - add task */}
                          {style.height >= 100 && (
                            <div>
                              <div className="text-[10px] opacity-70 truncate uppercase tracking-wide font-medium mb-0.5">
                                {client?.name || 'No Client'}
                              </div>
                              <div className="font-medium text-xs truncate leading-tight">
                                {entry.project}
                              </div>
                              <div className="text-[10px] opacity-75 mt-1">
                                {timeRange}
                              </div>
                              {entry.description && (
                                <div className="text-xs opacity-85 truncate leading-tight mt-1.5">
                                  {entry.description}
                                </div>
                              )}
                              {entry.description && style.height >= 130 && (
                                <div className="text-[10px] opacity-75 line-clamp-2 mt-2">
                                  {entry.description}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Dragging preview for new entry */}
                    {dragging && dragging.dayIndex === dayIndex && draggingStyle && (
                      <div
                        className="absolute left-0 right-0 rounded opacity-50 bg-blue-200 border-2 border-blue-600"
                        style={{
                          top: draggingStyle.top,
                          height: draggingStyle.height,
                        }}
                      />
                    )}

                    {/* Dragged entry preview */}
                    {draggedEntry && draggedEntry.previewDayIndex === dayIndex && (() => {
                      const previewClient = clients.find(c => c.id === draggedEntry.entry.clientId);
                      const previewStyle = getBlockStyle(draggedEntry.entry);
                      const previewTimeRange = `${formatTime12Hour(draggedEntry.entry.startTime)} - ${formatTime12Hour(draggedEntry.entry.endTime)}`;
                      
                      return (
                        <div
                          className="absolute left-1 right-1 rounded px-2.5 py-2 text-white pointer-events-none border-2 border-dashed border-white/50 opacity-60 overflow-hidden"
                          style={{
                            top: draggedEntry.previewY,
                            height: previewStyle.height,
                            backgroundColor: previewClient?.color || '#6b7280',
                            minHeight: '20px',
                          }}
                        >
                          {/* Very small blocks - just project name */}
                          {previewStyle.height < 40 && (
                            <div className="font-medium text-xs truncate">{draggedEntry.entry.project}</div>
                          )}
                          
                          {/* Small blocks - project + time */}
                          {previewStyle.height >= 40 && previewStyle.height < 70 && (
                            <div>
                              <div className="font-medium text-xs truncate leading-tight">
                                {draggedEntry.entry.project}
                              </div>
                              <div className="text-[10px] opacity-75 mt-0.5">
                                {previewTimeRange}
                              </div>
                            </div>
                          )}
                          
                          {/* Medium blocks - add client name */}
                          {previewStyle.height >= 70 && previewStyle.height < 100 && (
                            <div>
                              <div className="text-[10px] opacity-70 truncate uppercase tracking-wide font-medium mb-0.5">
                                {previewClient?.name || 'No Client'}
                              </div>
                              <div className="font-medium text-xs truncate leading-tight">
                                {draggedEntry.entry.project}
                              </div>
                              <div className="text-[10px] opacity-75 mt-1">
                                {previewTimeRange}
                              </div>
                            </div>
                          )}
                          
                          {/* Large blocks - add task */}
                          {previewStyle.height >= 100 && (
                            <div>
                              <div className="text-[10px] opacity-70 truncate uppercase tracking-wide font-medium mb-0.5">
                                {previewClient?.name || 'No Client'}
                              </div>
                              <div className="font-medium text-xs truncate leading-tight">
                                {draggedEntry.entry.project}
                              </div>
                              <div className="text-[10px] opacity-75 mt-1">
                                {previewTimeRange}
                              </div>
                              {draggedEntry.entry.description && (
                                <div className="text-xs opacity-85 truncate leading-tight mt-1.5">
                                  {draggedEntry.entry.description}
                                </div>
                              )}
                              {draggedEntry.entry.description && previewStyle.height >= 130 && (
                                <div className="text-[10px] opacity-75 line-clamp-2 mt-2">
                                  {draggedEntry.entry.description}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};