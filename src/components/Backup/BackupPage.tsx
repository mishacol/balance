import React from 'react';
import { BackupManager } from './BackupManager';

export const BackupPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Data Backup & Recovery</h1>
        <BackupManager />
      </div>
    </div>
  );
};
