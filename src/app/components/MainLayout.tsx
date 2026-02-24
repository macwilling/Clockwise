import { Outlet, Link, useLocation } from 'react-router';
import { Clock, FileText, LayoutDashboard, Users, ChevronLeft, ChevronRight, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { cn } from './ui/utils';
import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Timesheet', path: '/timesheet', icon: Clock },
  { name: 'Invoices', path: '/invoices', icon: FileText },
  { name: 'Clients', path: '/clients', icon: Users },
];

export const MainLayout = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to sign out');
    }
    // onAuthStateChange in App.tsx will clear the session and redirect to /login
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 text-white flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className={cn(
          "p-6 border-b border-slate-800",
          isCollapsed && "p-3"
        )}>
          {!isCollapsed ? (
            <>
              <h1 className="text-2xl font-bold">TimeTracker</h1>
              <p className="text-sm text-slate-400 mt-1">Consulting Management</p>
            </>
          ) : (
            <div className="text-center">
              <Clock className="w-8 h-8 mx-auto text-blue-500" />
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  isCollapsed && 'justify-center px-2'
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          {/* Settings Link */}
          <Link
            to="/settings"
            className={cn(
              "w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              location.pathname === '/settings'
                ? 'bg-[#00a3e0] text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? "Settings" : undefined}
          >
            <SettingsIcon className="w-5 h-5" />
            {!isCollapsed && <span className="text-sm">Settings</span>}
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-2 px-4 py-2 rounded-lg text-slate-300 hover:bg-red-900 hover:text-white transition-colors",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? "Sign out" : undefined}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span className="text-sm">Sign Out</span>}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "w-full flex items-center gap-2 px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </button>
          {!isCollapsed && (
            <p className="text-xs text-slate-500 mt-3 text-center">© 2026 TimeTracker</p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};
