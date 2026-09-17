# Ludzo workspace UI refresh

## Design
- Charcoal / warm neutral surfaces with a mint-green brand accent; existing light, dark and system theme preferences are preserved.
- Original geometric SVG logo and animated isometric board illustration (no image downloads or runtime image service).
- Desktop workspace sidebar, responsive dashboard, mobile safe-area navigation, three balance cards and a split onboarding layout.
- Decorative emoji in visible UI replaced by SVG icons or plain descriptive labels. The legacy `EmptyState.emoji` input remains supported: that component already translates it into SVG.
- Keyboard focus rings, language selection state, browser zoom, and reduced-motion support.

The sidebar appears at 1024px. The dashboard uses two-column reward cards on desktop and stacks them on mobile. Live matches retain their full-screen layout, board geometry and player colours.

## Boundaries
No changes to API routes, hooks, authentication handlers, database schema, engine, matchmaking, ad/reward eligibility, payment processing or settlement. Display values still come from the existing props/API data. Wallet conversion captions now display the supplied `coinRate` rather than a hard-coded caption.

## Verification
- `npx tsc --noEmit`: passed.
- `npm run build`: passed (82 pages generated).
- `/language`: HTTP 200 from the local server.
- `git diff --check`: passed.
- `npm run verify:engine`: 59/60 checks passed; the unchanged engine fails `bot avoids stepping into danger when a safe alternative exists`. Engine and verification scripts have no diff.
- Browser automation was attempted but Chromium download failed with a network/TLS reset. Responsive visual inspection and authenticated end-to-end tests are therefore not claimed.

## Telegram acceptance checklist
Use a test account and non-production funds where appropriate:
1. Select a language; continue through real Telegram authentication.
2. Compare mobile widths 320 / 390 / 768 and desktop widths 1024 / 1440. Check long names and large balances.
3. Open Settings and check light, dark and system appearance; enable device reduced motion.
4. Check Home, Tasks, Games, Refer, Profile and desktop sidebar links, including back navigation.
5. Verify rewarded-ad completion, streak eligibility and refreshed wallet values.
6. Check deposit/withdraw forms, history, empty/error/loading states and admin tables.
7. Join a Ludo game and verify the board, turns, result, forfeit and return navigation.
8. Keyboard-tab through onboarding and navigation; ensure focus is visible and mobile bottom controls clear the safe area.

Browser preview can show onboarding without Telegram. Authentication and live financial/game flows still require the original Telegram/backend configuration; no preview-only auth bypass or fake balances were introduced.

## Follow-up — custom duotone icon system + deposit back-navigation (session 01a0aea5)

### Deposit back arrow (reported bug)
The first deposit screen rendered no back control because visibility was gated on `step > 1`. The contract is now:
- **Step 1 (first screen)** — back arrow always visible, navigates to Home (`/home`).
- **Step 2 (network)** — back returns to coin selection.
- **Step 3 (pre-payment)** — back returns to network selection.
- **Active payment / in-flight creation** — back hidden (original protection preserved).
- The shared `PageHeader` back control is a full **44 × 44 px** touch target (`w-11 h-11`) with a decoupled compact glyph, per-step `aria-label`, and symmetric header spacers so the title stays optically centered.

### Custom duotone SVGs (all internal icons)
- New hand-drawn icon system: `components/ui/DuotoneIcons.tsx` (~50 marks). Design language: 24×24 grid, 1.6px round stroke, soft `currentColor` fill layer (12–18%) under a crisp primary layer, so every icon inherits theme color in light and dark mode. Small control glyphs (chevrons, arrows, checks) stay single-tone on purpose.
- `SymbolIcon` now resolves to this set (same names/API), so wallet, history, deposit and task rows all upgraded automatically.
- Payment networks (TON / TRC20 / BEP20) are gradient coin marks with two-tone white glyphs, shared via `NetworkIcon` — the deposit page no longer carries its own copies.
- **Every `lucide-react` import was removed from the app** (workspace, onboarding, gaming hub profile/matches, admin console). The gaming board's own custom `GamingIcons`/`Icons` files are untouched.

### Design / motion / a11y polish
- Standalone pages (deposit, withdraw, settings, history, faq, support, legal, leaderboard) are now **centered on desktop**: `AppShell` flags `.app-workspace-standalone`, the sidebar gutter is dropped and the 760px sheet centers via `margin: 0 auto` (was flush-left with a phantom 244px offset).
- Theme-aware step indicator (soft-glow active ring via `--accent-soft`, success state via `--success-strong`), directional spring step transitions, staggered preset/network/list entrances, QR fade-in, shimmer skeletons (custom `ludzo-shimmer`, replaces `animate-pulse`), mobile nav elevation shadow.
- New tokens: `--accent-contrast`, `--success-strong`, `--success-soft` for both themes.
- Deposit a11y: `aria-pressed` on amount presets, `role="radiogroup"`/`role="radio"` + `aria-checked` on networks, labelled custom input with `aria-invalid`/`aria-describedby` and error `role="alert"`, labelled copy buttons and toast dismiss.
- `MotionConfig reducedMotion="user"` (existing) + global `prefers-reduced-motion` CSS keep every animation honouring the device preference.

### Boundaries (unchanged)
No changes to `app/api/*`, `hooks/*`, `lib/*` (incl. `ludo-engine.ts`), SQL, Telegram auth, payment create/poll/webhook handlers, wallet math, reward/streak eligibility, matchmaking or Ludo rules. Deposit polling (5s), 40-minute session window, terminal-state set and API calls are byte-for-byte the same handlers; only presentation and navigation wiring changed.

### Verification
- `npx tsc --noEmit`: passed.
- `npm run build`: passed (82 pages).
- `node scripts/verify-deposit-navigation.mjs`: 18/18 checks passed (back contract, 44px target, centering rules, payment invariants).
- Production-server SSR smoke: `/`, `/language`, `/deposit`, `/withdraw`, `/settings`, `/history`, `/tasks`, `/home` → HTTP 200; `/deposit` SSR contains the step-1 back control (`aria-label="Back to home"`, 44px class) and duotone SVG layers; standalone CSS rules confirmed in the shipped stylesheet.
- `npm run verify:engine`: 59/60; the single failing check (`bot avoids stepping into danger when a safe alternative exists`) is the pre-existing engine behaviour from before this work — engine and engine script have no diff here.
- `git diff --check`: passed.

### Limitations
- Browser automation was not possible in this sandbox: the Chromium-for-testing and apt repositories are not reachable (TLS/network reset), same as the previous session. Visual confirmation therefore rests on SSR HTML inspection + the live server preview; a real device pass inside the Telegram app (auth, live deposit settlement, light/dark/reduced-motion) still requires the production backend per the checklist above.
