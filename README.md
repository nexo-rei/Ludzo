# LUDZO V2 — Premium Telegram Mini App

> **Earn • Play • Win** — A Telegram Mini App where users earn Coins by watching rewarded ads, completing tasks, and maintaining daily streaks. Built with React + Vite + Supabase.

---

## Features

| Feature | Description |
|---|---|
| **Rewarded Ads** | Monetag SDK — 2 Coins/ad, 15 ads/day limit |
| **Daily Streak** | 7-day reward cycle (2→10 Coins), requires 3 bonus ads |
| **Tasks** | Channel/Group/Ad/Custom tasks with Start→Verify→Claim flow |
| **Dual Wallet** | Coin Wallet (in-app) + USDT Wallet (real money) |
| **Deposits** | Binance Pay integration, $5 minimum |
| **Withdrawals** | Manual review, 5% fee, 48hr processing |
| **Referrals** | 10 Coins new-user bonus + 10% first-deposit commission |
| **Leaderboard** | All-time USDT earners ranking |
| **Admin Panel** | Full management at `/admin` |
| **10 Languages** | EN, RU, UK, ES, PT, FR, DE, IT, TR, HI |
| **Dark/Light/System Theme** | Full theme support |

---

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: Framer Motion
- **Database**: Supabase PostgreSQL
- **Auth**: Telegram Mini App (no passwords)
- **Payments**: Binance Pay API
- **Ads**: Monetag Rewarded Ads (`show_11113056()`)

---

## Quick Start

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your Supabase URL, anon key, etc.
```

### 3. Set up Supabase database

Run these SQL files in your Supabase SQL Editor in order:
1. `supabase/schema.sql` — Creates all 18 tables
2. `supabase/functions.sql` — RPC functions (award_coins, award_usdt, get_leaderboard)
3. `supabase/policies.sql` — Row Level Security policies
4. `supabase/seed.sql` — Initial settings and sample tasks

### 4. Run development server
```bash
pnpm dev
```

---

## Project Structure

```
src/
├── components/
│   ├── common/          # SplashScreen, LanguageSelection, LudzoLogo, RouteGuard
│   ├── home/            # BalanceCards, WatchAdsCard, DailyStreakCard, etc.
│   ├── layouts/         # AppLayout (+ BottomNav), AdminLayout
│   └── ui/              # shadcn/ui components
├── contexts/
│   ├── AuthContext.tsx  # Telegram auth + user/wallet state
│   └── ThemeContext.tsx # Dark/Light/System theme
├── hooks/
│   ├── useTelegram.ts   # Telegram WebApp SDK wrapper
│   └── useTranslation.ts
├── lib/
│   └── i18n.ts          # 10-language translation system
├── pages/
│   ├── HomePage.tsx
│   ├── TasksPage.tsx
│   ├── GamesPage.tsx
│   ├── ReferPage.tsx
│   ├── ProfilePage.tsx
│   ├── LeaderboardPage.tsx
│   ├── TransactionsPage.tsx
│   ├── DepositPage.tsx
│   ├── WithdrawPage.tsx
│   ├── SettingsPage.tsx
│   ├── FAQPage.tsx
│   ├── PrivacyPage.tsx
│   ├── TermsPage.tsx
│   ├── SupportPage.tsx
│   └── admin/
│       ├── AdminDashboard.tsx
│       ├── AdminUsers.tsx
│       ├── AdminTasks.tsx
│       ├── AdminDeposits.tsx
│       ├── AdminWithdrawals.tsx
│       ├── AdminSettings.tsx
│       └── AdminAnnouncements.tsx
├── services/
│   └── api.ts           # All Supabase data access functions
├── types/
│   └── types.ts         # Full TypeScript type definitions
├── App.tsx              # Root: splash → language → router
└── routes.tsx           # Route definitions + nested child routes
```

---

## Navigation Flow

```
App Launch
  ↓
Splash Screen (3s)
  ↓
Language Selection (first launch only)
  ↓
Home Page
  ↓ Bottom Nav
  ├── /           → Home
  ├── /tasks      → Tasks
  ├── /games      → Games (Coming Soon)
  ├── /refer      → Refer & Earn
  └── /profile    → Profile
      ├── /deposit
      ├── /withdraw
      ├── /transactions
      ├── /settings
      ├── /leaderboard
      ├── /faq
      ├── /privacy
      ├── /terms
      └── /support
  
Admin Panel (/admin)
  ├── /admin           → Dashboard
  ├── /admin/users
  ├── /admin/tasks
  ├── /admin/deposits
  ├── /admin/withdrawals
  ├── /admin/settings
  └── /admin/announcements
```

---

## Economy

| Action | Reward |
|---|---|
| Watch rewarded ad | +2 Coins |
| Daily streak Day 1 | +2 Coins |
| Daily streak Day 7 | +10 Coins |
| Complete task | +varies |
| Welcome bonus | +10 Coins |
| Referral join bonus | +10 Coins |
| Referrer first-deposit commission | +10% USDT |

**Rate**: 100 Coins = $1 USD (display only — Coins are not withdrawable)

---

## Admin Panel

Access at `/admin`. No separate login — protected by Telegram ID check in production.

| Module | Features |
|---|---|
| Dashboard | 7 KPI cards — users, deposits, withdrawals, ad views, revenue |
| Users | List, search, ban/unban |
| Tasks | Create/edit/delete, toggle active |
| Deposits | View all, filter by status |
| Withdrawals | Review, approve, reject, mark paid |
| Settings | Edit all platform settings live |
| Announcements | Create/edit/delete, publish/unpublish |

---

## Deployment (Vercel / Cloudflare Pages)

### Vercel
```bash
npx vercel --prod
# Set env vars in Vercel dashboard
```

### Cloudflare Pages
1. Connect your Git repository
2. Build command: `pnpm build`
3. Output directory: `dist`
4. Add environment variables in Pages settings

### Telegram Bot Setup
1. Create bot with [@BotFather](https://t.me/BotFather)
2. Enable Mini App: `/newapp`
3. Set Web App URL to your deployed domain
4. Set `TELEGRAM_BOT_TOKEN` in environment

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `TELEGRAM_BOT_TOKEN` | Bot token for task verification |
| `TELEGRAM_BOT_USERNAME` | Bot username (without @) |
| `BINANCE_API_KEY` | Binance Pay merchant API key |
| `BINANCE_SECRET_KEY` | Binance Pay secret |
| `BINANCE_WEBHOOK_SECRET` | Webhook signature secret |
| `VITE_MONETAG_ZONE_ID` | Monetag zone ID (default: 11113056) |

---

## License

MIT © LUDZO 2025
