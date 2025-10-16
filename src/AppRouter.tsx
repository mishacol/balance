import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App } from './App';
import { Layout } from './components/Layout';
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { TransactionsPage } from './components/Transactions/TransactionsPage';
import { TransactionForm } from './components/Transactions/TransactionForm';
import { BackupPage } from './components/Backup/BackupPage';
import { SettingsPage } from './components/Settings/SettingsPage';
import { AnalyticsPage } from './components/Analytics/AnalyticsPage';
import { ProfilePage } from './components/Profile/ProfilePage';
export function AppRouter() {
  return <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout>
              <DashboardPage />
            </Layout>} />
        <Route path="/transactions" element={<Layout>
              <TransactionsPage />
            </Layout>} />
        <Route path="/add-transaction" element={<Layout>
              <TransactionForm />
            </Layout>} />
        <Route path="/edit-transaction/:id" element={<Layout>
              <TransactionForm />
            </Layout>} />
        <Route path="/backup" element={<Layout>
              <BackupPage />
            </Layout>} />
        <Route path="/analytics" element={<Layout>
              <AnalyticsPage />
            </Layout>} />
        <Route path="/analytics/:widget" element={<Layout>
              <AnalyticsPage />
            </Layout>} />
        <Route path="/settings" element={<Layout>
              <SettingsPage />
            </Layout>} />
        <Route path="/faq" element={<Layout>
              <div className="text-center py-12">
                <h2 className="text-xl font-bold mb-4">
                  FAQ Coming Soon
                </h2>
                <p className="text-gray-400">
                  Frequently asked questions will be available here.
                </p>
              </div>
            </Layout>} />
        <Route path="/profile" element={<Layout>
              <ProfilePage />
            </Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>;
}