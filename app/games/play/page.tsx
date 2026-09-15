"use client";

/**
 * LUDZO — /games/play (legacy alias of the Play tab)
 * ─────────────────────────────────────────────────────────────────────────────
 * Play is the Ludo arena. No "coming soon" games, no game shelf — just Ludo.
 * Kept as a real route (not a redirect) so old links/bookmarks land instantly.
 */

import LudoLobby from "@/components/gaming/LudoLobby";

export default function PlayPage() {
  return <LudoLobby />;
}
