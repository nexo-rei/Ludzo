"use client";

import React from "react";

interface IconProps {
  size?: number;
  className?: string;
  active?: boolean;
}

const baseClass = (className?: string) =>
  `transition-all duration-300 ${className ?? ""}`;

// ─── Navigation Icons ───

export function HomeIcon({ size = 24, className, active }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path
        d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5Z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
      <path
        d="M9 22V12h6v10"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MatchesIcon({ size = 24, className, active }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path
        d="M8 3l-2 3h4l-2-3zM16 3l-2 3h4l-2-3zM6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
      <path
        d="M12 13v4M9.5 15h5"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayIcon({ size = 24, className, active }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
      <path
        d="M10 8.5l6 3.5-6 3.5V8.5z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.3 : 0}
      />
    </svg>
  );
}

export function ProfileIcon({ size = 24, className, active }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path
        d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
      <path
        d="M20 21c0-3.5-3.5-6.5-8-6.5s-8 3-8 6.5"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Game Icons ───

export function LudoIcon({ size = 48, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={baseClass(className)}
    >
      {/* Board outline */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Center star */}
      <path
        d="M24 18l1.5 4.5h4.5l-3.5 2.5 1.5 4.5-3.5-2.5-3.5 2.5 1.5-4.5-3.5-2.5h4.5z"
        fill="currentColor"
        fillOpacity="0.8"
      />
      {/* Home bases */}
      <rect x="5" y="5" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.12" />
      <rect x="31" y="5" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.12" />
      <rect x="5" y="31" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.12" />
      <rect x="31" y="31" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.12" />
      {/* Cross paths */}
      <path d="M24 3v42M3 24h42" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" />
      {/* Tokens */}
      <circle cx="9" cy="9" r="2" fill="currentColor" fillOpacity="0.6" />
      <circle cx="13" cy="9" r="2" fill="currentColor" fillOpacity="0.6" />
      <circle cx="39" cy="9" r="2" fill="currentColor" fillOpacity="0.6" />
      <circle cx="35" cy="9" r="2" fill="currentColor" fillOpacity="0.6" />
      <circle cx="9" cy="39" r="2" fill="currentColor" fillOpacity="0.6" />
      <circle cx="13" cy="39" r="2" fill="currentColor" fillOpacity="0.6" />
      <circle cx="39" cy="39" r="2" fill="currentColor" fillOpacity="0.6" />
      <circle cx="35" cy="39" r="2" fill="currentColor" fillOpacity="0.6" />
    </svg>
  );
}

export function WaterSortIcon({ size = 48, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={baseClass(className)}
    >
      <rect x="6" y="14" width="8" height="26" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="20" y="8" width="8" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="34" y="18" width="8" height="22" rx="4" stroke="currentColor" strokeWidth="1.5" />
      {/* Liquid fills */}
      <path d="M7 28h6v10a3 3 0 0 1-3 3 3 3 0 0 1-3-3V28z" fill="currentColor" fillOpacity="0.25" />
      <path d="M21 20h6v18a3 3 0 0 1-3 3 3 3 0 0 1-3-3V20z" fill="currentColor" fillOpacity="0.18" />
      <path d="M35 30h6v8a3 3 0 0 1-3 3 3 3 0 0 1-3-3v-8z" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

export function ChessIcon({ size = 48, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={baseClass(className)}
    >
      <rect
        x="4"
        y="4"
        width="40"
        height="40"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="currentColor"
        fillOpacity="0.06"
      />
      {/* Grid */}
      <path d="M4 16h40M4 28h40M4 40h40M16 4v40M28 4v40" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.25" />
      {/* King */}
      <path
        d="M22 12h4M24 10v4M24 16v4M21 20h6v-4h-1v-2h-4v2h-1z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="26" r="3" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
      <path d="M20 32h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function MoreGamesIcon({ size = 48, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={baseClass(className)}
    >
      <rect x="6" y="6" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
      <rect x="28" y="6" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
      <rect x="6" y="28" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
      <rect x="28" y="28" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
      <path d="M35 35l6 6M41 35l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Utility Icons ───

export function TrophyIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path
        d="M8 21h8M12 17v4M7 4h10M7 4a4 4 0 0 0-4 4v1a3 3 0 0 0 3 3h1M17 4a4 4 0 0 1 4 4v1a3 3 0 0 1-3 3h-1M9 9c0 1.5 1.5 3 3 3s3-1.5 3-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CoinIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" fill="currentColor" fillOpacity="0.12" />
      <path d="M12 7v10M9.5 9h5M9.5 15h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CashIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 10h20M2 14h20" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.3" />
    </svg>
  );
}

export function ActivePlayersIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <circle cx="12" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
      <path d="M5 21c0-3 3-5.5 7-5.5s7 2.5 7 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5" cy="9" r="2" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1" />
      <circle cx="19" cy="9" r="2" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1" />
    </svg>
  );
}

export function SoundOnIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SoundOffIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M23 9l-6 6M17 9l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SunIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MoonIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
    </svg>
  );
}

export function AutoThemeIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
      <path d="M12 6a6 6 0 0 1 0 12A6 6 0 0 1 12 6z" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function SupportIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyStateIcon({ size = 80, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      className={baseClass(className)}
    >
      <rect x="12" y="20" width="56" height="44" rx="6" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.04" />
      <path d="M12 32h56M20 16v-3a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="28" cy="48" r="4" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.08" />
      <circle cx="52" cy="48" r="4" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.08" />
      <path d="M32 56c2 2 5 3 8 3s6-1 8-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Sparkle dots */}
      <circle cx="14" cy="14" r="2" fill="currentColor" fillOpacity="0.2" />
      <circle cx="66" cy="12" r="1.5" fill="currentColor" fillOpacity="0.15" />
      <circle cx="70" cy="24" r="1" fill="currentColor" fillOpacity="0.2" />
      <circle cx="10" cy="26" r="1" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function EmptyHistoryIcon({ size = 80, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      className={baseClass(className)}
    >
      <rect x="16" y="10" width="48" height="60" rx="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.04" />
      <path d="M24 10v60M56 10v60" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.15" />
      <path d="M24 22h32M24 34h24M24 46h28M24 58h20" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.2" />
      <circle cx="40" cy="36" r="10" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.06" />
      <path d="M34 36h12M40 30v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  );
}

export function MegaphoneIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path d="M3 11v2M6.5 8v8l6 3.5V4.5L6.5 8zM19 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.08" />
    </svg>
  );
}

export function LockIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrendUpIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path d="M23 6l-9 9-5-5L1 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrendDownIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path d="M23 18l-9-9-5 5L1 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 18h6v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.2"
      />
    </svg>
  );
}

export function FlameIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path
        d="M12 22c4.5 0 8-3.5 8-8 0-4-3-7-3-11 0 0-3 2-5 5-1-2-3-4-3-4 0 4-3 7-3 11 0 4.5 3.5 8 8 8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.12"
      />
    </svg>
  );
}

export function OneVsOneIcon({ size = 40, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={baseClass(className)}
    >
      <circle cx="12" cy="14" r="5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1" />
      <circle cx="28" cy="14" r="5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1" />
      <path d="M6 34c0-4 3-7 6-7s6 3 6 7M22 34c0-4 3-7 6-7s6 3 6 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M20 8v24" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" strokeOpacity="0.3" />
    </svg>
  );
}

export function OneVsThreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={baseClass(className)}
    >
      <circle cx="8" cy="12" r="4" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1" />
      <circle cx="20" cy="8" r="4" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1" />
      <circle cx="32" cy="12" r="4" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1" />
      <circle cx="20" cy="28" r="4" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1" />
      <path d="M4 34c0-3 2-5 4-5s4 2 4 5M16 38c0-3 2-5 4-5s4 2 4 5M28 34c0-3 2-5 4-5s4 2 4 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 16l12 8M32 16l-12 8" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.2" strokeLinecap="round" />
    </svg>
  );
}

export function TournamentIcon({ size = 40, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={baseClass(className)}
    >
      <path d="M6 6h6v6H6zM17 6h6v6h-6zM28 6h6v6h-6z" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1" />
      <path d="M9 12v4h4v-4M20 12v4h4v-4M31 12v4h4v-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 16v4h14v-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M18 20v6M22 20v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M15 26h10v4H15z" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" strokeLinejoin="round" />
      <path d="M20 30v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function PracticeIcon({ size = 40, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={baseClass(className)}
    >
      <circle cx="20" cy="12" r="6" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1" />
      <path d="M14 24c0-4 3-7 6-7s6 3 6 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10 34h20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M20 18v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="20" cy="10" r="2" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={baseClass(className)}
    >
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
