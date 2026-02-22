import { Toaster } from './components/ui/sonner';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { MainLayout } from './components/MainLayout';
import { TimesheetView } from './components/TimesheetView';
import { InvoicesView } from './components/InvoicesView';
import { DashboardView } from './components/DashboardView';
import { ClientsView } from './components/ClientsView';
import { ClientDetailPage } from './components/clients/ClientDetailPage';
import { Settings } from './components/settings/Settings';
import { PublicInvoiceView } from './components/invoices/PublicInvoiceView';
import { DataProvider } from './contexts/DataContext';

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <Routes>
          {/* Public invoice view route (no auth, no layout) */}
          <Route path="/invoice/:id" element={<PublicInvoiceView />} />
          
          {/* Main app routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardView />} />
            <Route path="timesheet" element={<TimesheetView />} />
            <Route path="invoices" element={<InvoicesView />} />
            <Route path="clients" element={<ClientsView />} />
            <Route path="clients/:clientId" element={<ClientDetailPage />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <Toaster />
      </DataProvider>
    </BrowserRouter>
  );
}