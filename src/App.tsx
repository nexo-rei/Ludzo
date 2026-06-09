import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SplashScreen from '@/components/common/SplashScreen';
import LanguageSelection from '@/components/common/LanguageSelection';
import { setLanguage } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import { appChildRoutes, adminChildRoutes } from './routes';

// Layouts
import AppLayout from '@/components/layouts/AppLayout';
import AdminLayout from '@/components/layouts/AdminLayout';

// Standalone pages
import LeaderboardPage from '@/pages/LeaderboardPage';
import TransactionsPage from '@/pages/TransactionsPage';
import DepositPage from '@/pages/DepositPage';
import WithdrawPage from '@/pages/WithdrawPage';
import SettingsPage from '@/pages/SettingsPage';
import FAQPage from '@/pages/FAQPage';
import PrivacyPage from '@/pages/PrivacyPage';
import TermsPage from '@/pages/TermsPage';
import SupportPage from '@/pages/SupportPage';

const FIRST_LAUNCH_KEY = 'ludzo_lang_selected';

type AppPhase = 'splash' | 'language' | 'app';

const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>('splash');

  const handleSplashComplete = useCallback(() => {
    const langSelected = localStorage.getItem(FIRST_LAUNCH_KEY);
    setPhase(langSelected ? 'app' : 'language');
  }, []);

  const handleLanguageSelect = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem(FIRST_LAUNCH_KEY, lang);
    setPhase('app');
  }, []);

  // Keep theme class in sync on mount
  useEffect(() => {
    const saved = localStorage.getItem('ludzo_theme') ?? 'dark';
    document.documentElement.classList.remove('dark', 'light');
    if (saved === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.classList.add(saved);
    }
  }, []);

  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        {/* Splash Screen — always mounted first */}
        {phase === 'splash' && (
          <SplashScreen onComplete={handleSplashComplete} />
        )}

        {/* Language Selection — first launch only */}
        {phase === 'language' && (
          <LanguageSelection onSelect={handleLanguageSelect} />
        )}

        {/* Main App */}
        {phase === 'app' && (
          <Router>
            <Routes>
              {/* ── Main app shell (AppLayout + BottomNav) ── */}
              <Route path="/" element={<AppLayout />}>
                {appChildRoutes.map((r, i) =>
                  r.index
                    ? <Route key={i} index element={r.element} />
                    : <Route key={i} path={r.path} element={r.element} />
                )}
              </Route>

              {/* ── Admin panel shell ── */}
              <Route path="/admin" element={<AdminLayout />}>
                {adminChildRoutes.map((r, i) =>
                  r.index
                    ? <Route key={i} index element={r.element} />
                    : <Route key={i} path={r.path} element={r.element} />
                )}
              </Route>

              {/* ── Standalone pages (no bottom nav) ── */}
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/deposit" element={<DepositPage />} />
              <Route path="/withdraw" element={<WithdrawPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/support" element={<SupportPage />} />

              {/* ── Fallback ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        )}

        <Toaster richColors position="top-center" />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
