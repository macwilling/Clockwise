import { useState, useEffect } from 'react';
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
import { LoginPage } from './components/auth/LoginPage';
import { supabase } from './utils/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // Listen for auth state changes (login / logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-lg text-slate-500">Loading…</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public invoice view — no auth required */}
        <Route path="/invoice/:id" element={<PublicInvoiceView />} />

        {/* Login route — redirect to home if already authenticated */}
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <LoginPage />}
        />

        {/* Protected main app routes */}
        <Route
          path="/"
          element={
            session ? (
              <DataProvider>
                <MainLayout />
              </DataProvider>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
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
    </BrowserRouter>
  );
}
