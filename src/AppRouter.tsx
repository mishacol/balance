import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { App } from './App';
import { Layout } from './components/Layout';
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { TransactionsPage } from './components/Transactions/TransactionsPage';
import { TransactionForm } from './components/Transactions/TransactionForm';
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
        <Route path="/analytics" element={<Layout>
              <div className="text-center py-12">
                <h2 className="text-xl font-bold mb-4">
                  Analytics Coming Soon
                </h2>
                <p className="text-gray-400">
                  This feature is under development.
                </p>
              </div>
            </Layout>} />
        <Route path="/settings" element={<Layout>
              <div className="text-center py-12">
                <h2 className="text-xl font-bold mb-4">Settings Coming Soon</h2>
                <p className="text-gray-400">
                  This feature is under development.
                </p>
              </div>
            </Layout>} />
      </Routes>
    </BrowserRouter>;
}