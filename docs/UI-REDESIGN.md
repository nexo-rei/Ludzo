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
