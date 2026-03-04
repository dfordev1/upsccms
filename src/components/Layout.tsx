import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  LayoutDashboard, 
  Database, 
  Upload, 
  BrainCircuit, 
  LogOut,
  Menu,
  X,
  PieChart
} from 'lucide-react';

export default function Layout() {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Question Bank', href: '/questions', icon: Database },
    { name: 'Upload CSV', href: '/upload', icon: Upload },
    { name: 'Create Test', href: '/test/create', icon: BrainCircuit },
    { name: 'Analytics', href: '/analytics', icon: PieChart },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-uw-navy">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-[#061020]">
            <h1 className="text-xl font-bold text-white tracking-tight">UPSC CMS Prep</h1>
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-uw-blue text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-5 w-5 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-slate-800 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div>
                  <div className="inline-block h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white truncate max-w-[150px]">
                    {user?.email}
                  </p>
                  <button
                    onClick={signOut}
                    className="text-xs font-medium text-slate-400 hover:text-white flex items-center mt-1 transition-colors"
                  >
                    <LogOut size={14} className="mr-1" /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-uw-navy h-16 flex items-center justify-between px-4">
        <h1 className="text-xl font-bold text-white tracking-tight">UPSC CMS Prep</h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-300 hover:text-white"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-uw-navy pt-16">
          <nav className="px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center px-2 py-3 text-base font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-uw-blue text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon
                    className={`mr-4 flex-shrink-0 h-6 w-6 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                signOut();
              }}
              className="w-full group flex items-center px-2 py-3 text-base font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <LogOut className="mr-4 flex-shrink-0 h-6 w-6 text-slate-400 group-hover:text-white" />
              Sign Out
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden md:pl-64 pt-16 md:pt-0">
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 md:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
