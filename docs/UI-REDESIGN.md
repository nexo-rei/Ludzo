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

---

## Follow-up — leaderboard tokens, viewport-safe sheets, Telegram long-press (session 01a0b350)

Three player-reported defects, all presentation-layer. No API contract, economy rule,
matchmaking or engine code was changed.

### 1. Leaderboard now speaks the workspace design system
`app/leaderboard/page.tsx` (and the Home "Top earners" card) carried a private palette —
gold/silver/bronze gradients, `#63D9B4`, `#10B981`, `rgba(91,33,182,…)` and `text-white` —
so in light mode names went white-on-white and the board looked like a different product.
Everything now resolves through the shared tokens (`--card-bg`, `--border`, `--accent`,
`--accent-soft`, `--accent-contrast`, `--text-primary/secondary/muted`, `--bg-elevated`),
which is what makes it read as professional in both themes:

- flat `rounded-2xl` cards, no drop-shadow soup; the champion alone gets an accent ring + glow;
- segmented period control with one spring-driven `layoutId` pill instead of three painted buttons;
- podium bars tinted from tokens (accent → 2nd/3rd step down into neutrals), staggered spring entrance,
  count-up amounts, a slow sheen on the champion bar, and a pinned "your rank" card that stays
  reachable while the list scrolls;
- standings rows show a share-of-leader bar so rank gaps are readable without a second column;
- loading is a podium-shaped shimmer (not a generic list), plus real empty and error/retry states;
- `useReducedMotion` + the existing `MotionConfig reducedMotion="user"` collapse all of it.

### 2. Rankings expose names, never handles
Ranks 4+ used to append `@username`. `lib/leaderboard.ts` now normalises the
`get_leaderboard()` rows **server-side** into `display_name` (first + last name, whitespace
collapsed, 26-char cap, neutral `"Ludzo Player"` fallback — never a handle), and `username`
is simply not part of the payload any more, so no client can render it. `/api/leaderboard`
and `/api/home` (`leaderboard_top3`) both run through it, and `LeaderboardEntry` lost the
`username` field so TypeScript flags any future regression.

### 3. Dialogs cannot fall off the screen
`components/ui/Sheet.tsx` is the new single dialog primitive: panel capped to the *visible*
viewport (`.ludzo-sheet-panel`: `86vh` → `86svh` where supported), header and action row
pinned, only the body scrolls (`overscroll-contain`), safe-area padding on the footer,
bottom sheet on phones / centered card from `sm:` up, drag-the-handle or Escape or backdrop
to dismiss, body scroll locked, `role="dialog"` + `aria-modal`, and it portals to `document.body`
so hub styling or an ancestor `transform` can never clip or re-tint it.

Adopted by the Ludo lobby's **Match confirmation** (the reported bug: Confirm/Cancel slid under
the nav after picking a stake), the **matchmaking radar**, and the hub profile **rules sheet**.
The game-end overlay and the two admin modals that had the same clipping hazard got a scroll
container.

### 4. Long press does nothing (the URL leak)
Inside Telegram, holding Home / Tasks / Games / Refer / Profile opened the WebView callout with
the app's real address — defeating the whole point of a hidden domain. Two layers now stop it:

- `app/workspace.css`: `*` gets `-webkit-touch-callout: none` + `-webkit-user-drag: none`, body gets
  `user-select: none`; form fields, `.selectable` (legal copy) and `.allow-longpress` (deposit QR,
  where saving the code is a feature) opt back in; the admin console stays selectable for staff.
- `components/layout/TelegramHardening.tsx` (mounted in the root layout): `contextmenu` blocked
  for touch/pen gestures (a desktop right-click still works, for QA), `dragstart` and `selectstart`
  blocked, selection cleared when a hold crosses 520 ms, and the follow-up click on an
  `<a href>` is swallowed so a long press navigates nowhere.

Taps, momentum scrolling and every form field behave exactly as before.

### Boundaries
No change to auth, wallet math, escrow/settlement, queue polling, task or ad eligibility, SQL,
`lib/ludo-engine.ts` or any API contract beyond dropping `username` from leaderboard rows.
`/api/leaderboard` is now explicitly `force-dynamic` (rankings must never be cached at the edge).

### Verification
- `npx tsc --noEmit`: clean. `npx next build`: passed.
- `npm run verify:ui` (`scripts/verify-ui-fixes.mjs`): 79 checks — name-only rows, token-only
  palette, portal/sheet invariants, `svh` cap, hardening CSS + listeners, and `displayName()`
  unit assertions (a handle can never become a name).
- `npm run verify:engine`: unchanged at 59/60 — the single failing check is the pre-existing
  `bot avoids stepping into danger when a safe alternative exists` behaviour; no engine diff here.
- SSR smoke on `next dev`: `/leaderboard`, `/home`, `/games`, `/games/play`, `/games/profile`,
  `/tasks`, `/deposit` → HTTP 200, no server warnings.
- Still required on a device (no browser automation in this sandbox): Telegram iOS + Android long
  press on every nav tab and card, stake confirm sheet on a 320 × 568 viewport, light/dark
  appearance on the board, and reduced-motion.
