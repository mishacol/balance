import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTransactionStore } from '../../store/transactionStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { loadTransactionsFromSupabase, switchToSupabase } = useTransactionStore();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        // User is authenticated, switch to Supabase and load data
        switchToSupabase();
        loadTransactionsFromSupabase();
      } else {
        // User is not authenticated, redirect to auth page
        navigate('/auth');
      }
    }
  }, [loading, isAuthenticated, user, navigate, loadTransactionsFromSupabase, switchToSupabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-highlight mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to auth page
  }

  return <>{children}</>;
};
