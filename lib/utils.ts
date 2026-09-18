import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCoins(amount: number): string {
  return amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatUSDT(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
}

/** Anything that may carry a human name (Telegram users, leaderboard rows, …). */
export interface NameSource {
  display_name?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

/**
 * The account NAME — and deliberately never the @username.
 *
 * Leaderboard / ranking rows used to render "First name @handle"; that leaked a
 * handle the player never chose to publish and broke row alignment on narrow
 * phones. Names fall back to a neutral label instead of a username.
 */
export function displayName(user?: NameSource | null, fallback = "Ludzo Player"): string {
  const explicit = (user?.display_name ?? user?.full_name ?? "").trim();
  if (explicit) return truncate(explicit, 26);

  const joined = [user?.first_name, user?.last_name]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");

  return joined ? truncate(joined, 26) : fallback;
}

/** First letters for an avatar placeholder, e.g. "Aarav Sharma" → "AS". */
export function initials(name: string, max = 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, max)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function toTitleCase(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
