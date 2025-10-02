import React from 'react';
import { AppRouter } from './AppRouter';
import { useAutoBackup } from './hooks/useAutoBackup';

export function App() {
  // Initialize automatic backup system
  useAutoBackup();

  return (
    <div className="bg-background text-white min-h-screen">
      <AppRouter />
    </div>
  );
}