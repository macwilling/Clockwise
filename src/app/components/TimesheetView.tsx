import { useState } from 'react';
import { format, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar, List, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { WeeklyCalendar } from './timesheet/WeeklyCalendar';
import { TimesheetGrid } from './timesheet/TimesheetGrid';
import { TimeEntryForm } from './timesheet/TimeEntryForm';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { cn } from './ui/utils';
import { useData } from '../contexts/DataContext';

type ViewMode = 'calendar' | 'grid';

const TIME_RANGES = [
  { label: 'Business Hours (7AM - 6PM)', start: 7, end: 18 },
  { label: 'Work Day (6AM - 8PM)', start: 6, end: 20 },
  { label: 'Extended (5AM - 11PM)', start: 5, end: 23 },
  { label: 'Full Day (12AM - 11PM)', start: 0, end: 24 },
];

export const TimesheetView = () => {
  const { timeEntries } = useData();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [prefillData, setPrefillData] = useState<{
    date?: string;
    startTime?: string;
    endTime?: string;
  } | null>(null);
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);

  // Load time range from localStorage or default to business hours
  const [timeRange, setTimeRange] = useState<{ start: number; end: number }>(() => {
    const saved = localStorage.getItem('calendar-time-range');
    if (saved) {
      return JSON.parse(saved);
    }
    return TIME_RANGES[0]; // Business Hours default
  });

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  // Calculate total hours for the week
  const calculateWeeklyHours = () => {
    const weekDayStrings = weekDays.map(day => format(day, 'yyyy-MM-dd'));
    const weekEntries = timeEntries.filter(entry => weekDayStrings.includes(entry.date));
    
    let totalMinutes = 0;
    weekEntries.forEach(entry => {
      const [startHours, startMinutes] = entry.startTime.split(':').map(Number);
      const [endHours, endMinutes] = entry.endTime.split(':').map(Number);
      const minutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
      totalMinutes += minutes;
    });
    
    return (totalMinutes / 60).toFixed(1);
  };

  const weeklyHours = calculateWeeklyHours();

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart((prev) => addWeeks(prev, direction === 'next' ? 1 : -1));
  };

  // Navigate to the week containing a specific date
  const navigateToDate = (dateString: string) => {
    const date = parseISO(dateString);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    setCurrentWeekStart(weekStart);
  };

  const handleNewEntry = (data?: { date: string; startTime: string; endTime: string }) => {
    setPrefillData(data || null);
    setSelectedEntry(null);
    setIsFormOpen(true);
  };

  const handleEditEntry = (entryId: string) => {
    setSelectedEntry(entryId);
    setPrefillData(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedEntry(null);
    setPrefillData(null);
  };

  // After form submission, navigate to the week containing the entry
  const handleFormSuccess = (entryDate: string) => {
    navigateToDate(entryDate);
    handleCloseForm();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Timesheet</h1>
          <p className="text-slate-600 mt-1">Track your time and manage projects</p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              viewMode === 'calendar'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Calendar className="w-4 h-4" />
            Calendar
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <List className="w-4 h-4" />
            Grid
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <Card className="p-6">
          {/* Week Navigator, Hours Summary, Time Range, and Add Entry Button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {format(currentWeekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
                </h2>
                <span className="px-2.5 py-0.5 text-sm font-medium bg-[#00a3e0]/10 text-[#00a3e0] rounded-full">
                  {weeklyHours} hrs
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Time Range Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowRangeDropdown(!showRangeDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-700">
                    {TIME_RANGES.find(r => r.start === timeRange.start && r.end === timeRange.end)?.label || 'Custom Range'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                {showRangeDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowRangeDropdown(false)}
                    />
                    <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                      {TIME_RANGES.map((range, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setTimeRange({ start: range.start, end: range.end });
                            localStorage.setItem('calendar-time-range', JSON.stringify({ start: range.start, end: range.end }));
                            setShowRangeDropdown(false);
                          }}
                          className={cn(
                            'w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors',
                            index === 0 && 'rounded-t-lg',
                            index === TIME_RANGES.length - 1 && 'rounded-b-lg',
                            range.start === timeRange.start && range.end === timeRange.end &&
                              'bg-blue-50 text-blue-700 font-medium'
                          )}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <Button size="sm" onClick={() => handleNewEntry()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </div>
          </div>

          {/* Weekly Calendar */}
          <WeeklyCalendar
            weekDays={weekDays}
            onEditEntry={handleEditEntry}
            onNewEntry={handleNewEntry}
            timeRange={timeRange}
            onTimeRangeChange={(range) => {
              setTimeRange(range);
              localStorage.setItem('calendar-time-range', JSON.stringify(range));
            }}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => handleNewEntry()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </div>
          <TimesheetGrid onEditEntry={handleEditEntry} />
        </div>
      )}

      {/* Time Entry Form Sheet */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="text-xl">{selectedEntry ? 'Edit Time Entry' : 'New Time Entry'}</SheetTitle>
            <SheetDescription className="text-base">
              {selectedEntry
                ? 'Update the details of your time entry'
                : 'Add a new time entry to your timesheet'}
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-6">
            <TimeEntryForm
              entryId={selectedEntry}
              prefillData={prefillData}
              onClose={handleCloseForm}
              onSuccess={handleFormSuccess}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};