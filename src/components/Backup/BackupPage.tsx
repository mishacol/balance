import React from 'react';
import { BackupManager } from './BackupManager';
import { DataMigration } from './DataMigration';
import { BackupHistory } from './BackupHistory';

export const BackupPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Data Backup & Recovery</h1>
        <DataMigration />
        <BackupManager />
        <BackupHistory />
      </div>
    </div>
  );
};
