# Ludzo - Deployment Guide

## Prerequisites
- Node.js 18+
- pnpm or npm
- Supabase account
- Telegram Bot (@BotFather)
- Cloudflare account (for hosting)

## 1. Supabase Setup
1. Create a new Supabase project
2. Run the SQL migrations from `supabase/migrations/` (or apply via Supabase dashboard)
3. Copy your project URL and anon key
4. Generate a Service Role Key from Project Settings > API

## 2. Telegram Bot Setup
1. Create a bot with @BotFather
2. Set the bot name to "Ludzo" and username to `@LudzoBot`
3. Set the bot description and about text
4. Enable the bot as a Mini App via BotFather:
   - `/mybots` → Select LudzoBot → Bot Settings → Mini App → Create Mini App
   - Set the URL to your Cloudflare Pages URL (after first deploy, or use a placeholder)
5. Get the bot token from BotFather

## 3. Environment Variables
Copy `.env.example` to `.env.local` and fill in all values:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=LudzoBot
NEXT_PUBLIC_MONETAG_ZONE_ID=11113056
```

## 4. Local Development
```bash
pnpm install
pnpm dev
```

## 5. Cloudflare Pages Deployment

### Option A: Using Wrangler CLI
```bash
# Install dependencies
pnpm install

# Build for Cloudflare Pages
npx @cloudflare/next-on-pages

# Deploy
npx wrangler pages deploy .vercel/output/static
```

### Option B: Using Git Integration
1. Connect your GitHub/GitLab repo to Cloudflare Pages
2. Set build command: `npx @cloudflare/next-on-pages`
3. Set build output directory: `.vercel/output/static`
4. Add environment variables in Cloudflare Pages dashboard
5. Deploy

## 6. Post-Deployment
1. Update the Mini App URL in BotFather to your deployed URL
2. Create default settings in the `settings` table:
   ```sql
   INSERT INTO settings (key, value) VALUES
   ('welcome_bonus', '20'),
   ('referral_reward', '20'),
   ('referral_commission', '10'),
   ('ad_reward', '2'),
   ('daily_ad_limit', '15'),
   ('upi_min', '50'),
   ('upi_max', '5000'),
   ('usdt_min', '10'),
   ('usdt_max', '50'),
   ('withdrawal_fee', '5');
   ```
3. Create default tasks:
   ```sql
   INSERT INTO tasks (title, description, type, reward_coins, is_active, sort_order)
   VALUES
   ('Join Official Channel', 'Join @LudzoOfficial', 'channel', 30, true, 1),
   ('Join Community Group', 'Join our community', 'group', 30, true, 2);
   ```

## 7. Admin Access
- Owner account is pre-set to Telegram ID `7565458414`
- Admin panel at `/admin/login`
- Only users with role `admin`, `moderator`, or `owner` can access

## Architecture
- **Frontend**: Next.js 15 App Router + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL
- **Auth**: Telegram Mini App initData
- **Hosting**: Cloudflare Pages
- **Bot**: @LudzoBot
- **Support**: @LudzosupportBot
- **Channel**: @LudzoOfficial
