# LUDZO V3 — Telegram Mini App

**Earn • Play • Win** — A premium Telegram Mini App for rewarded advertisements, daily streaks, tasks, and referrals.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + custom CSS variables |
| Animations | Framer Motion |
| Backend | Supabase (PostgreSQL + RLS) |
| Auth | Telegram Mini App Init Data |
| Payments | Binance Pay |
| Ads | Monetag Rewarded Ads |
| Deployment | Cloudflare Pages |

---

## Project Structure

```
ludzo-v3/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes (30 endpoints)
│   │   ├── admin/              # Admin-only endpoints
│   │   ├── ads/                # Ad reward / streak / status
│   │   ├── auth/telegram/      # Telegram auth
│   │   ├── deposits/           # Binance Pay deposit flow
│   │   ├── withdrawals/        # USDT withdrawal flow
│   │   ├── tasks/              # Task list / verify / claim
│   │   ├── wallet/             # Balance + history
│   │   ├── referrals/          # Referral stats + history
│   │   ├── leaderboard/        # USDT earnings leaderboard
│   │   ├── announcements/      # Public announcements
│   │   ├── profile/            # User profile + preferences
│   │   └── home/               # Aggregated home page data
│   ├── admin/                  # Admin panel (9 pages)
│   ├── auth/                   # Telegram auth page
│   ├── home/                   # Home dashboard
│   ├── tasks/                  # Task list
│   ├── games/                  # Coming soon page
│   ├── refer/                  # Referral page
│   ├── profile/                # User profile
│   ├── settings/               # Theme + language settings
│   ├── leaderboard/            # USDT leaderboard
│   ├── deposit/                # Binance Pay deposit
│   ├── withdraw/               # USDT withdrawal
│   ├── history/                # Transaction history
│   ├── faq/                    # FAQ
│   ├── privacy/                # Privacy policy
│   ├── terms/                  # Terms of service
│   ├── support/                # Support tickets
│   ├── maintenance/            # Maintenance mode screen
│   ├── language/               # Language selection
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global CSS + theme variables
├── components/
│   ├── admin/AdminShell.tsx    # Admin sidebar layout
│   ├── cards/                  # Home page card sections
│   ├── layout/                 # AppShell, BottomNav, PageHeader, LudzoLogo, SplashScreen
│   └── ui/                     # Button, Card, Input, Badge, ProgressBar, Skeleton, Toast, EmptyState
├── hooks/
│   ├── useTelegram.ts          # Telegram WebApp integration
│   └── useApp.tsx              # Global app context (userId, wallet, prefs)
├── lib/
│   ├── auth.ts                 # JWT auth helpers
│   ├── settings.ts             # DB settings loader with defaults
│   ├── telegram.ts             # Telegram init data validator + Binance webhook
│   ├── utils.ts                # Formatting utilities
│   ├── i18n.ts                 # Translation system (10 languages)
│   └── supabase/               # Supabase client (browser + admin)
├── sql/
│   ├── schema.sql              # All table definitions
│   ├── functions.sql           # credit_usdt, debit_usdt, get_leaderboard, etc.
│   ├── policies.sql            # Row Level Security policies
│   └── seed.sql                # Default admin user + settings
├── types/index.ts              # All TypeScript types
├── middleware.ts               # Maintenance mode redirect
├── next.config.ts              # Next.js config
├── tailwind.config.ts          # Tailwind config with dark/light theme
└── .env.example                # Environment variable template
```

---

## Setup

### 1. Clone & Install

```bash
git clone <repo>
cd ludzo-v3
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `TELEGRAM_BOT_TOKEN` | Your Telegram Bot token from @BotFather |
| `TELEGRAM_BOT_USERNAME` | Your bot username (e.g. `LudzoBot`) |
| `BINANCE_API_KEY` | Binance Pay API key |
| `BINANCE_SECRET_KEY` | Binance Pay secret key |
| `BINANCE_WEBHOOK_SECRET` | Binance Pay webhook signing secret |
| `NEXT_PUBLIC_MONETAG_ZONE_ID` | Monetag rewarded ad zone ID |
| `JWT_SECRET` | Secret for admin JWT tokens (min 32 chars) |

### 3. Database Setup

Run SQL files in this order in your Supabase SQL editor:

```sql
-- 1. Schema (tables + indexes)
\i sql/schema.sql

-- 2. Functions (credit_usdt, debit_usdt, etc.)
\i sql/functions.sql

-- 3. RLS Policies
\i sql/policies.sql

-- 4. Seed data (default admin + settings)
\i sql/seed.sql
```

### 4. Run Locally

```bash
npm run dev
```

App runs at `http://localhost:3000`

---

## Admin Panel

Access the admin panel at `/admin`.

Default credentials (from seed.sql):
- **Username:** `admin`
- **Password:** `ludzo_admin_2024` *(change immediately after first login)*

Admin features:
- Dashboard with live stats and charts
- User management (search, balance adjustment, suspend)
- Task management (CRUD: channel/group/ad/custom tasks)
- Deposit management (review, approve, reject)
- Withdrawal management (review, approve, reject, mark paid)
- Announcement management (priority levels)
- Platform settings (all economy values configurable)
- Maintenance mode toggle
- Admin action logs

---

## Economy Rules

| Feature | Value (Configurable in Admin) |
|---------|-------------------------------|
| Welcome bonus | 10 Coins |
| Normal ad reward | 2 Coins |
| Daily ad limit | 15 ads (30 Coins max/day) |
| Bonus ads for streak | 3 (separate from normal) |
| Streak rewards | Day 1–7: 2/3/4/5/6/8/10 Coins |
| Referral commission | 10% of referee's first deposit (USDT) |
| Minimum deposit | $5 USDT |
| Minimum withdrawal | $5 USDT |
| Withdrawal fee | 5% |

**Important:** Coins cannot be withdrawn, converted, or transferred. USDT only flows through deposits and withdrawals.

---

## Deployment (Cloudflare Pages)

1. Connect your Git repository to Cloudflare Pages
2. Build command: `npm run build`
3. Build output directory: `.next`
4. Add all environment variables in Cloudflare Pages dashboard
5. Enable **Next.js** preset (or use `@cloudflare/next-on-pages`)

---

## Languages Supported

English, Russian, Ukrainian, Spanish, Portuguese, French, German, Italian, Turkish, Hindi

---

## License

Private — All rights reserved.
