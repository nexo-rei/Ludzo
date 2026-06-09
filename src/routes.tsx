import React from 'react';
import type { ReactNode } from 'react';

// Layouts
import AppLayout from '@/components/layouts/AppLayout';
import AdminLayout from '@/components/layouts/AdminLayout';

// Main app pages
import HomePage from '@/pages/HomePage';
import TasksPage from '@/pages/TasksPage';
import GamesPage from '@/pages/GamesPage';
import ReferPage from '@/pages/ReferPage';
import ProfilePage from '@/pages/ProfilePage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import TransactionsPage from '@/pages/TransactionsPage';
import DepositPage from '@/pages/DepositPage';
import WithdrawPage from '@/pages/WithdrawPage';
import SettingsPage from '@/pages/SettingsPage';
import FAQPage from '@/pages/FAQPage';
import PrivacyPage from '@/pages/PrivacyPage';
import TermsPage from '@/pages/TermsPage';
import SupportPage from '@/pages/SupportPage';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminTasks from '@/pages/admin/AdminTasks';
import AdminDeposits from '@/pages/admin/AdminDeposits';
import AdminWithdrawals from '@/pages/admin/AdminWithdrawals';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminAnnouncements from '@/pages/admin/AdminAnnouncements';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  // ── Main app (with AppLayout shell + bottom nav) ──
  {
    name: 'App Shell',
    path: '/',
    element: <AppLayout />,
    public: true,
  },

  // ── Admin panel (with AdminLayout shell) ──
  {
    name: 'Admin Shell',
    path: '/admin',
    element: <AdminLayout />,
    public: true,
  },

  // ── Info pages (standalone, no bottom nav) ──
  { name: 'Leaderboard', path: '/leaderboard', element: <LeaderboardPage />, public: true },
  { name: 'Transactions', path: '/transactions', element: <TransactionsPage />, public: true },
  { name: 'Deposit', path: '/deposit', element: <DepositPage />, public: true },
  { name: 'Withdraw', path: '/withdraw', element: <WithdrawPage />, public: true },
  { name: 'Settings', path: '/settings', element: <SettingsPage />, public: true },
  { name: 'FAQ', path: '/faq', element: <FAQPage />, public: true },
  { name: 'Privacy', path: '/privacy', element: <PrivacyPage />, public: true },
  { name: 'Terms', path: '/terms', element: <TermsPage />, public: true },
  { name: 'Support', path: '/support', element: <SupportPage />, public: true },
];

// Nested child routes for AppLayout <Outlet>
export const appChildRoutes = [
  { index: true, element: <HomePage /> },
  { path: 'tasks', element: <TasksPage /> },
  { path: 'games', element: <GamesPage /> },
  { path: 'refer', element: <ReferPage /> },
  { path: 'profile', element: <ProfilePage /> },
];

// Nested child routes for AdminLayout <Outlet>
export const adminChildRoutes = [
  { index: true, element: <AdminDashboard /> },
  { path: 'users', element: <AdminUsers /> },
  { path: 'tasks', element: <AdminTasks /> },
  { path: 'deposits', element: <AdminDeposits /> },
  { path: 'withdrawals', element: <AdminWithdrawals /> },
  { path: 'settings', element: <AdminSettings /> },
  { path: 'announcements', element: <AdminAnnouncements /> },
];
