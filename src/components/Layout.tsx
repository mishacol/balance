import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, PieChartIcon, ListIcon, PlusCircleIcon, SettingsIcon, ShieldIcon, HelpCircleIcon, LogInIcon, UserIcon, LogOutIcon, CheckCircleIcon } from 'lucide-react';
import { Logo } from './ui/Logo';
import { useAuth } from '../hooks/useAuth';
import { supabaseService } from '../services/supabaseService';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAuthenticated } = useAuth();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const loadUsername = async () => {
      if (user && isAuthenticated) {
        try {
          const { data: profile } = await supabaseService.getUserProfile(user.id);
          setUsername(profile?.username || user.email?.split('@')[0] || 'User');
        } catch (error) {
          console.error('Failed to load username:', error);
          setUsername(user.email?.split('@')[0] || 'User');
        }
      } else {
        setUsername(null);
      }
    };

    loadUsername();
  }, [user, isAuthenticated]);
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };
  
  const navItems = [
    { path: '/', icon: <HomeIcon size={20} />, label: 'Dashboard' },
    { path: '/transactions', icon: <ListIcon size={20} />, label: 'Transactions' },
    { path: '/analytics', icon: <PieChartIcon size={20} />, label: 'Analytics' },
    { path: '/backup', icon: <ShieldIcon size={20} />, label: 'Backup' },
    { path: '/settings', icon: <SettingsIcon size={20} />, label: 'Settings' },
    { path: '/faq', icon: <HelpCircleIcon size={20} />, label: 'FAQ' }
  ];

  const authItem = isAuthenticated 
    ? { 
        action: handleSignOut, 
        icon: <LogOutIcon size={20} />, 
        label: 'Sign Out',
        className: 'text-red-400 hover:text-red-300'
      }
    : { 
        path: '/auth', 
        icon: <LogInIcon size={20} />, 
        label: 'Sign In',
        className: ''
      };

  const profileItem = isAuthenticated 
    ? { 
        path: '/profile', 
        icon: <UserIcon size={20} />, 
        label: 'Profile',
        className: ''
      }
    : null;

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

        {/* User Status */}
        {isAuthenticated && username && (
          <div className="px-4 pb-4">
            <div className="bg-highlight/10 border border-highlight/20 rounded-lg p-3 flex items-center space-x-2">
              <CheckCircleIcon size={14} className="text-green-400 flex-shrink-0" />
              <span className="text-xs text-gray-400">Signed in as</span>
              <span className="text-sm font-medium text-white">@{username}</span>
            </div>
          </div>
        )}
        <nav className={isAuthenticated && username ? "mt-4" : "mt-8"}>
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
            
            {/* Profile link (only when authenticated) */}
            {profileItem && (
              <li className="mb-2">
                <Link 
                  to={profileItem.path} 
                  className={`flex items-center p-3 md:px-4 hover:bg-border rounded-md transition-colors ${
                    location.pathname === profileItem.path ? 'bg-border text-highlight' : 'text-gray-400'
                  }`}
                >
                  <span className="mr-3">{profileItem.icon}</span>
                  <span className="hidden md:inline-block">{profileItem.label}</span>
                </Link>
              </li>
            )}
            
            {/* Auth action (Sign In/Out) */}
            <li className="mb-2">
              {authItem.action ? (
                <button
                  onClick={authItem.action}
                  className={`flex items-center p-3 md:px-4 hover:bg-border rounded-md transition-colors w-full text-left ${authItem.className || 'text-gray-400'}`}
                >
                  <span className="mr-3">{authItem.icon}</span>
                  <span className="hidden md:inline-block">{authItem.label}</span>
                </button>
              ) : (
                <Link 
                  to={authItem.path!} 
                  className={`flex items-center p-3 md:px-4 hover:bg-border rounded-md transition-colors ${
                    location.pathname === authItem.path ? 'bg-border text-highlight' : 'text-gray-400'
                  }`}
                >
                  <span className="mr-3">{authItem.icon}</span>
                  <span className="hidden md:inline-block">{authItem.label}</span>
                </Link>
              )}
            </li>
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