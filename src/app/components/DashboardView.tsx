import { useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, isWithinInterval, isPast } from 'date-fns';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, DollarSign, TrendingUp, AlertCircle, FileText, ArrowRight } from 'lucide-react';

export const DashboardView = () => {
  const { timeEntries, clients, invoices, getUninvoicedEntries } = useData();
  const navigate = useNavigate();

  // Calculate uninvoiced work per client
  const uninvoicedByClient = useMemo(() => {
    return clients.map(client => {
      const uninvoicedEntries = getUninvoicedEntries(client.id);
      const totalHours = uninvoicedEntries.reduce((sum, entry) => sum + entry.hours, 0);
      const estimatedValue = totalHours * client.hourlyRate;
      
      return {
        client,
        entries: uninvoicedEntries,
        totalHours,
        estimatedValue,
      };
    })
    .filter(item => item.entries.length > 0) // Only show clients with uninvoiced work
    .sort((a, b) => b.estimatedValue - a.estimatedValue); // Sort by value descending
  }, [clients, getUninvoicedEntries]);

  // Calculate total uninvoiced value
  const totalUninvoiced = useMemo(() => {
    return uninvoicedByClient.reduce((sum, item) => sum + item.estimatedValue, 0);
  }, [uninvoicedByClient]);

  // Calculate stats for current month
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Total hours this month
    const totalHours = timeEntries
      .filter((entry) => {
        const entryDate = parseISO(entry.date);
        return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, entry) => sum + entry.hours, 0);

    // Invoice stats
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);
    const totalOutstanding = invoices
      .filter((inv) => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);
    const overdueAmount = invoices
      .filter((inv) => {
        const dueDate = parseISO(inv.dueDate);
        return inv.status !== 'paid' && isPast(dueDate);
      })
      .reduce((sum, inv) => sum + inv.total, 0);

    return {
      totalHours: totalHours.toFixed(1),
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      overdueAmount,
    };
  }, [timeEntries, invoices]);

  // Hours by week chart data
  const weeklyHoursData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return weeks.map((weekStart) => {
      const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
      const hours = timeEntries
        .filter((entry) => {
          const entryDate = parseISO(entry.date);
          return isWithinInterval(entryDate, { start: weekStart, end: weekEndDate });
        })
        .reduce((sum, entry) => sum + entry.hours, 0);

      return {
        week: format(weekStart, 'MMM d'),
        hours: parseFloat(hours.toFixed(1)),
      };
    });
  }, [timeEntries]);

  // Recent time entries (last 10)
  const recentEntries = useMemo(() => {
    return [...timeEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [timeEntries]);

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
  }: {
    title: string;
    value: string;
    icon: any;
    color: string;
    subtitle?: string;
  }) => (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color} shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your consulting business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Hours This Month"
          value={stats.totalHours}
          icon={Clock}
          color="bg-blue-600"
          subtitle={`across ${timeEntries.length} entries`}
        />
        <StatCard
          title="Total Invoiced"
          value={`$${stats.totalInvoiced.toFixed(0)}`}
          icon={DollarSign}
          color="bg-green-600"
          subtitle={`${invoices.length} invoices`}
        />
        <StatCard
          title="Total Paid"
          value={`$${stats.totalPaid.toFixed(0)}`}
          icon={TrendingUp}
          color="bg-purple-600"
        />
        <StatCard
          title="Outstanding"
          value={`$${stats.totalOutstanding.toFixed(0)}`}
          icon={AlertCircle}
          color={stats.overdueAmount > 0 ? 'bg-red-600' : 'bg-slate-600'}
          subtitle={stats.overdueAmount > 0 ? `$${stats.overdueAmount.toFixed(0)} overdue` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hours by Week Chart */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Hours by Week</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyHoursData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent Time Entries */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Entries</h2>
          <div className="space-y-3">
            {recentEntries.map((entry) => {
              const client = clients.find((c) => c.id === entry.clientId);
              return (
                <div
                  key={entry.id}
                  className="pb-3 border-b border-gray-100 last:border-0 last:pb-0"
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {client?.name}
                    </p>
                    <p className="text-xs text-slate-600 whitespace-nowrap ml-2">
                      {entry.hours}h
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 truncate">{entry.project}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {format(parseISO(entry.date), 'MMM d, yyyy')}
                  </p>
                </div>
              );
            })}
            {recentEntries.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">
                No time entries yet
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* All Time Entries Table */}
      <Card className="mt-6">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-slate-900">All Time Entries</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...timeEntries]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((entry) => {
                const client = clients.find((c) => c.id === entry.clientId);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-slate-600">
                      {format(parseISO(entry.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">{client?.name}</TableCell>
                    <TableCell>{entry.project}</TableCell>
                    <TableCell className="max-w-xs truncate text-slate-600">
                      {entry.description}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {entry.startTime} - {entry.endTime}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {entry.hours.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </Card>

      {/* Uninvoiced Work */}
      {uninvoicedByClient.length > 0 && (
        <Card className="mt-6">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Uninvoiced Work by Client</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Total estimated value: <span className="font-semibold text-[#0ea5e9]">${totalUninvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
              </div>
              <Button
                className="bg-[#0F2847] hover:bg-[#0F2847]/90 text-white"
                onClick={() => navigate('/invoices')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Create Invoices
              </Button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {uninvoicedByClient.map((item) => (
              <div key={item.client.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.client.color }}
                      />
                      <h3 className="text-base font-semibold text-slate-900">{item.client.name}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-[#0ea5e9]/10 text-[#0ea5e9] font-medium">
                        {item.entries.length} {item.entries.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono font-semibold">{item.totalHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-mono font-semibold">
                          ${item.estimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-slate-500">@ ${item.client.hourlyRate}/hr</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#0ea5e9] text-[#0ea5e9] hover:bg-[#0ea5e9] hover:text-white"
                    onClick={() => navigate(`/clients/${item.client.id}`)}
                  >
                    View Details
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                
                {/* Show first 3 entries as preview */}
                <div className="mt-3 space-y-2">
                  {item.entries.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between text-xs bg-white rounded p-2 border border-slate-100">
                      <div className="flex-1">
                        <span className="text-slate-500">{format(parseISO(entry.date), 'MMM d, yyyy')}</span>
                        <span className="mx-2 text-slate-300">•</span>
                        <span className="text-slate-700 font-medium">{entry.project}</span>
                        {entry.description && (
                          <>
                            <span className="mx-2 text-slate-300">•</span>
                            <span className="text-slate-500 truncate max-w-xs inline-block align-bottom">{entry.description}</span>
                          </>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-slate-900 ml-4">{entry.hours}h</span>
                    </div>
                  ))}
                  {item.entries.length > 3 && (
                    <div className="text-xs text-slate-500 text-center pt-1">
                      + {item.entries.length - 3} more {item.entries.length - 3 === 1 ? 'entry' : 'entries'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};