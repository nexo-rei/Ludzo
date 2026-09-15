"use client";

/**
 * LUDZO — /games (the "Play" tab destination)
 * ─────────────────────────────────────────────────────────────────────────────
 * Play opens STRAIGHT into Ludo. This file is intentionally a thin wrapper:
 * all lobby logic + UI lives in components/gaming/LudoLobby.tsx so that
 * /games and /games/play render the exact same screen (the game screen calls
 * router.replace("/games") when a match ends, so this route must always be the
 * arena lobby).
 */

import LudoLobby from "@/components/gaming/LudoLobby";

export default function GamesPage() {
  return <LudoLobby />;
}
