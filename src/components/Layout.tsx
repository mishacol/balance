import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, PieChartIcon, ListIcon, PlusCircleIcon, SettingsIcon, ShieldIcon, HelpCircleIcon } from 'lucide-react';
import { Logo } from './ui/Logo';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    { path: '/', icon: <HomeIcon size={20} />, label: 'Dashboard' },
    { path: '/transactions', icon: <ListIcon size={20} />, label: 'Transactions' },
    { path: '/analytics', icon: <PieChartIcon size={20} />, label: 'Analytics' },
    { path: '/backup', icon: <ShieldIcon size={20} />, label: 'Backup' },
    { path: '/settings', icon: <SettingsIcon size={20} />, label: 'Settings' },
    { path: '/faq', icon: <HelpCircleIcon size={20} />, label: 'FAQ' }
  ];

  return (
    <div className="flex h-screen bg-background text-white">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 border-r border-border bg-surface">
        <div className="p-4 flex items-center justify-center md:justify-start">
          <Logo size={36} className="mr-1" />
          <span className="hidden md:inline-block font-mono text-highlight text-xl font-bold leading-none">
            balance
          </span>
          <span className="md:hidden text-highlight text-xl font-bold">bal</span>
        </div>
        <nav className="mt-8">
          <ul>
            {navItems.map(item => (
              <li key={item.path} className="mb-2">
                <Link 
                  to={item.path} 
                  className={`flex items-center p-3 md:px-4 hover:bg-border rounded-md transition-colors ${
                    location.pathname === item.path ? 'bg-border text-highlight' : 'text-gray-400'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span className="hidden md:inline-block">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>

      {/* Add transaction button with tooltip */}
      <div className="fixed right-6 bottom-6 group">
        <button 
          className="bg-highlight text-background rounded-full p-3 shadow-lg hover:bg-opacity-80 transition-colors" 
          aria-label="Add transaction"
          onClick={() => navigate('/add-transaction')}
        >
          <PlusCircleIcon size={24} />
        </button>
        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-surface border border-border rounded px-3 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none">
          <span className="text-sm text-white">Add transaction</span>
          {/* Tooltip arrow */}
          <div className="absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-surface"></div>
        </div>
      </div>
    </div>
  );
};