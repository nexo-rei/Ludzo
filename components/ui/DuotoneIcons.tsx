/**
 * LUDZO — custom duotone SVG icon system
 * ─────────────────────────────────────────────────────────────────────────────
 * Every icon in the internal workspace is hand-drawn here (no third-party
 * icon font/runtime). Design language:
 *
 *   • 24 × 24 grid, 1.6px primary stroke, round caps & joins
 *   • "duotone" composition: a soft currentColor fill layer (~12–18% opacity)
 *     sits behind a crisp primary stroke layer — so icons inherit theme color
 *     automatically in light and dark mode via CSS `color`
 *   • small control glyphs (chevrons, arrows, checks, X) stay single-tone on
 *     purpose — that is what reads as "premium" at 12–16px
 *   • payment-network marks keep their brand colors as gradient coin tiles
 */

import { useId, type SVGProps } from "react";
import LudzoCoin from "@/components/ui/LudzoCoin";

export type DuotoneIconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Shared svg base — stroke layer is controlled per-icon. */
function dt(size: number, props: DuotoneIconProps) {
  const { size: _s, ...rest } = props;
  return {
    width: _s ?? size,
    height: _s ?? size,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
    ...rest,
  };
}

/** Soft duotone fill layer. */
function Soft({ d, opacity = 0.14, ...extra }: { d: string; opacity?: number } & SVGProps<SVGPathElement>) {
  return <path d={d} fill="currentColor" opacity={opacity} stroke="none" {...extra} />;
}

/** Primary stroke layer. */
function Line({ children, width = 1.6 }: { children: React.ReactNode; width?: number | string }) {
  return (
    <g fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  );
}

/* ═══════════════════════════ NAVIGATION ═══════════════════════════ */

export function HomeNavIcon({ size = 20, ...props }: DuotoneIconProps) {
  const d = "M5 10.2 12 4l7 6.2V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8.8z";
  return (
    <svg {...dt(size, props)}>
      <Soft d={d} />
      <Line>
        <path d={d} />
        <path d="M10 21v-4.2a2 2 0 1 1 4 0V21" />
      </Line>
    </svg>
  );
}

export function TasksNavIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" opacity={0.13} />
      <Line>
        <rect x="4" y="3" width="16" height="18" rx="2.5" />
        <path d="m8.6 12.2 2 2 3.8-4" />
        <path d="M8.6 16.6h6.8" />
      </Line>
    </svg>
  );
}

export function GamesNavIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M7.5 7h9a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5h-9a5 5 0 0 1-5-5v-2a5 5 0 0 1 5-5z" opacity={0.13} />
      <Line>
        <rect x="2.5" y="7" width="19" height="12" rx="6" />
        <path d="M8 10.5v4M6 12.5h4" />
      </Line>
      <circle cx="15.6" cy="11.3" r="1.15" fill="currentColor" />
      <circle cx="18" cy="14" r="1.15" fill="currentColor" opacity={0.55} />
    </svg>
  );
}

export function UsersIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="9" cy="7.5" r="3.8" fill="currentColor" opacity={0.15} stroke="none" />
      <Line>
        <circle cx="9" cy="7.5" r="3.8" />
        <path d="M16.2 20.5v-1.4a4.6 4.6 0 0 0-4.6-4.6H5.4a4.6 4.6 0 0 0-4.6 4.6v1.4" />
        <path d="M15.8 4a3.8 3.8 0 0 1 0 7" />
        <path d="M23.2 20.5v-1.4a4.6 4.6 0 0 0-3.2-4.4" />
      </Line>
    </svg>
  );
}

export function ProfileNavIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="8" r="4.2" fill="currentColor" opacity={0.15} stroke="none" />
      <Line>
        <circle cx="12" cy="8" r="4.2" />
        <path d="M4.5 20.5v-.8a6.2 6.2 0 0 1 6.2-6.2h2.6a6.2 6.2 0 0 1 6.2 6.2v.8" />
      </Line>
    </svg>
  );
}

export function SettingsNavIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="7.2" fill="currentColor" opacity={0.12} stroke="none" />
      <Line>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </Line>
    </svg>
  );
}

export function HistoryNavIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" opacity={0.12} stroke="none" />
      <Line>
        <path d="M3 3v5h5" />
        <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
        <path d="M12 7.5V12l3.5 2" />
      </Line>
    </svg>
  );
}

export function HelpNavIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" opacity={0.12} stroke="none" />
      <Line>
        <circle cx="12" cy="12" r="8.8" />
        <path d="M9.1 9a3 3 0 0 1 5.83 1c0 2-2.93 2.6-2.93 3.6" />
        <path d="M12 17.2h.01" />
      </Line>
    </svg>
  );
}

export function OverviewIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <rect x="3" y="3" width="7.5" height="9" rx="2" fill="currentColor" opacity={0.15} stroke="none" />
      <Line>
        <rect x="3" y="3" width="7.5" height="9" rx="2" />
        <rect x="13.5" y="3" width="7.5" height="5.5" rx="2" />
        <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2" />
        <rect x="3" y="15" width="7.5" height="6" rx="2" />
      </Line>
    </svg>
  );
}

/* ═══════════════════════════ WALLET ═══════════════════════════ */

/**
 * Coins — resolves to the single branded Ludzo coin mark so the same coin
 * shows up in balances, rewards, admin tables and anywhere `coins` is used.
 */
export function CoinsDuotoneIcon({ size = 20, className }: DuotoneIconProps) {
  return <LudzoCoin size={size} className={className} />;
}

export function WalletDuotoneIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M5.5 5.5h13a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-13a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z" opacity={0.14} />
      <Line>
        <rect x="2.5" y="5.5" width="19" height="13" rx="3" />
        <path d="M2.5 9.5h19" />
        <path d="M15.4 14.4h3.4" />
      </Line>
    </svg>
  );
}

export function DepositDuotoneIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M4 13.5h16V18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4.5z" opacity={0.15} />
      <Line>
        <path d="M12 3.5v9.8" />
        <path d="m8 9.6 4 4 4-4" />
        <path d="M3.5 13.5V18a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-4.5" />
      </Line>
    </svg>
  );
}

export function WithdrawDuotoneIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M4 13.5h16V18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4.5z" opacity={0.15} />
      <Line>
        <path d="M12 13.3V3.5" />
        <path d="m8 7.4 4-4 4 4" />
        <path d="M3.5 13.5V18a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-4.5" />
      </Line>
    </svg>
  );
}

export function UsdtDuotoneIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" opacity={0.12} stroke="none" />
      <Line>
        <circle cx="12" cy="12" r="8.8" />
        <path d="M7.2 8.6h9.6" />
        <path d="M12 8.6v8.8" />
        <path d="m8.6 13.6 3.4 2.4 3.4-2.4" />
      </Line>
    </svg>
  );
}

export function TrophyDuotoneIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M7 3.5h10V10a5 5 0 0 1-10 0V3.5z" opacity={0.18} />
      <Line>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 21.5h16" />
        <path d="M10 14.7V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 21.5" />
        <path d="M14 14.7V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 21.5" />
        <path d="M18 2.5H6V9a6 6 0 0 0 12 0V2.5z" />
      </Line>
    </svg>
  );
}

/* ═══════════════════════════ REWARDS & TASKS ═══════════════════════════ */

export function StarIcon({ size = 20, ...props }: DuotoneIconProps) {
  const d = "M12 2.6 14.9 8.4l6.4 1.05-4.63 4.5 1.1 6.35L12 17.25l-5.77 3.05 1.1-6.35L2.7 9.45l6.4-1.05L12 2.6z";
  return (
    <svg {...dt(size, props)}>
      <Soft d={d} opacity={0.2} />
      <Line>
        <path d={d} />
      </Line>
    </svg>
  );
}

export function AwardIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="9.2" r="5.4" fill="currentColor" opacity={0.16} stroke="none" />
      <Line>
        <circle cx="12" cy="9.2" r="5.4" />
        <path d="m8.8 13.6-1.5 7.4 4.7-2.4 4.7 2.4-1.5-7.4" />
      </Line>
    </svg>
  );
}

export function StreakFlameIcon({ size = 20, ...props }: DuotoneIconProps) {
  const d =
    "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";
  return (
    <svg {...dt(size, props)}>
      <Soft d={d} opacity={0.18} />
      <Line>
        <path d={d} />
      </Line>
    </svg>
  );
}

export function GiftIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M4 8.5h16V13H4z" opacity={0.16} />
      <Line>
        <path d="M20 12.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6.5" />
        <path d="M2.8 7.5h18.4v5H2.8z" />
        <path d="M12 7.5V21" />
        <path d="M12 7.5c-.3-2.8-2.3-4.4-4-3.6-1.7.9.1 3.6 4 3.6z" />
        <path d="M12 7.5c.3-2.8 2.3-4.4 4-3.6 1.7.9-.1 3.6-4 3.6z" />
      </Line>
    </svg>
  );
}

export function CrownIcon({ size = 20, ...props }: DuotoneIconProps) {
  const d = "M3.8 17 2.6 8.2 8 11.6 12 5.6l4 6 5.4-3.4L20.2 17z";
  return (
    <svg {...dt(size, props)}>
      <Soft d={d} opacity={0.18} />
      <Line>
        <path d={d} />
        <path d="M5.2 20.2h13.6" />
      </Line>
    </svg>
  );
}

export function PlayIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <path d="M8.2 5.4v13.2a.7.7 0 0 0 1.07.6l10.5-6.6a.7.7 0 0 0 0-1.2L9.27 4.8a.7.7 0 0 0-1.07.6z" fill="currentColor" />
    </svg>
  );
}

export function AdPlayIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M7 3.5h10a3.5 3.5 0 0 1 3.5 3.5v10a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5z" opacity={0.15} />
      <Line>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      </Line>
      <path d="M10 8.6v6.8a.55.55 0 0 0 .85.47l5.3-3.4a.55.55 0 0 0 0-.93l-5.3-3.4A.55.55 0 0 0 10 8.6z" fill="currentColor" />
    </svg>
  );
}

export function TargetIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="8.6" fill="currentColor" opacity={0.1} stroke="none" />
      <Line>
        <circle cx="12" cy="12" r="8.6" />
        <circle cx="12" cy="12" r="4.6" />
      </Line>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function DiceIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <rect x="4" y="4" width="16" height="16" rx="4.5" fill="currentColor" opacity={0.13} stroke="none" />
      <Line>
        <rect x="4" y="4" width="16" height="16" rx="4.5" />
      </Line>
      <circle cx="8.4" cy="8.4" r="1.15" fill="currentColor" />
      <circle cx="15.6" cy="8.4" r="1.15" fill="currentColor" opacity={0.55} />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" />
      <circle cx="8.4" cy="15.6" r="1.15" fill="currentColor" opacity={0.55} />
      <circle cx="15.6" cy="15.6" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function FlagIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M5 4.5h10.5l-1.8 3.3 1.8 3.3H5z" opacity={0.16} />
      <Line>
        <path d="M5 21V4" />
        <path d="M5 4h10.5l-1.8 3.3 1.8 3.3H5" />
      </Line>
    </svg>
  );
}

export function ZapIcon({ size = 20, ...props }: DuotoneIconProps) {
  const d = "M13 2 3.5 13.5H11l-1 8.5L19.5 10.5H12l1-8.5z";
  return (
    <svg {...dt(size, props)}>
      <Soft d={d} opacity={0.18} />
      <Line>
        <path d={d} />
      </Line>
    </svg>
  );
}

export function MegaphoneIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="m4 11 16-5v12l-16-4v-3z" opacity={0.14} />
      <Line>
        <path d="m3 11 18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </Line>
    </svg>
  );
}

/* ═══════════════════════════ STATUS ═══════════════════════════ */

export function CheckIcon({ size = 20, strokeWidth, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={strokeWidth ?? 1.9}>
        <path d="m5 12.8 4.2 4.2L19 7" />
      </Line>
    </svg>
  );
}

export function CheckCircleIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" opacity={0.14} stroke="none" />
      <Line>
        <circle cx="12" cy="12" r="8.8" />
        <path d="m8.2 12.3 2.5 2.5 5-5.4" />
      </Line>
    </svg>
  );
}

export function CloseIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.9}>
        <path d="M6 6l12 12M18 6 6 18" />
      </Line>
    </svg>
  );
}

export function CloseCircleIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" opacity={0.14} stroke="none" />
      <Line>
        <circle cx="12" cy="12" r="8.8" />
        <path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" />
      </Line>
    </svg>
  );
}

export function AlertCircleIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" opacity={0.14} stroke="none" />
      <Line>
        <circle cx="12" cy="12" r="8.8" />
        <path d="M12 7.8v5" />
        <path d="M12 16.2h.01" />
      </Line>
    </svg>
  );
}

export function AlertTriangleIcon({ size = 20, ...props }: DuotoneIconProps) {
  const d = "M10.29 4.1 2.85 16.8a1.9 1.9 0 0 0 1.65 2.9h15a1.9 1.9 0 0 0 1.65-2.9L13.71 4.1a1.9 1.9 0 0 0-3.42 0z";
  return (
    <svg {...dt(size, props)}>
      <Soft d={d} opacity={0.16} />
      <Line>
        <path d={d} />
        <path d="M12 9.3v4.4" />
        <path d="M12 16.9h.01" />
      </Line>
    </svg>
  );
}

export function InfoIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" opacity={0.14} stroke="none" />
      <Line>
        <circle cx="12" cy="12" r="8.8" />
        <path d="M12 11v5.2" />
        <path d="M12 7.6h.01" />
      </Line>
    </svg>
  );
}

export function TimerIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" opacity={0.12} stroke="none" />
      <Line>
        <circle cx="12" cy="12" r="8.8" />
        <path d="M12 7v5l3.4 2" />
      </Line>
    </svg>
  );
}

export function ShieldIcon({ size = 20, ...props }: DuotoneIconProps) {
  const d = "M12 2.6 19 5.5v5.7c0 4.6-3 7.9-7 9.6-4-1.7-7-5-7-9.6V5.5L12 2.6z";
  return (
    <svg {...dt(size, props)}>
      <Soft d={d} opacity={0.15} />
      <Line>
        <path d={d} />
        <path d="m8.9 11.8 2.2 2.2 4-4.4" />
      </Line>
    </svg>
  );
}

export function ShieldAlertIcon({ size = 20, ...props }: DuotoneIconProps) {
  const d = "M12 2.6 19 5.5v5.7c0 4.6-3 7.9-7 9.6-4-1.7-7-5-7-9.6V5.5L12 2.6z";
  return (
    <svg {...dt(size, props)}>
      <Soft d={d} opacity={0.15} />
      <Line>
        <path d={d} />
        <path d="M12 8v4.4" />
        <path d="M12 15.6h.01" />
      </Line>
    </svg>
  );
}

export function LoaderIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.8}>
        <path d="M21 12a9 9 0 1 1-9-9" />
      </Line>
    </svg>
  );
}

/* ═══════════════════════════ ACTIONS ═══════════════════════════ */

export function BackArrowIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.8}>
        <path d="M19.5 12h-15" />
        <path d="M12 5.5 5.5 12l6.5 6.5" />
      </Line>
    </svg>
  );
}

export function ArrowRightIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.8}>
        <path d="M4.5 12h15" />
        <path d="M12 5.5 18.5 12 12 18.5" />
      </Line>
    </svg>
  );
}

export function ArrowUpRightIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.8}>
        <path d="M7 17 17 7" />
        <path d="M8.5 7H17v8.5" />
      </Line>
    </svg>
  );
}

export function ArrowDownLeftIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.8}>
        <path d="M17 7 7 17" />
        <path d="M15.5 17H7V8.5" />
      </Line>
    </svg>
  );
}

export function ChevronRightIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.8}>
        <path d="m9 5.5 6.5 6.5L9 18.5" />
      </Line>
    </svg>
  );
}

export function ChevronLeftIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.8}>
        <path d="M15 5.5 8.5 12l6.5 6.5" />
      </Line>
    </svg>
  );
}

export function ChevronDownIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.8}>
        <path d="m5.5 9 6.5 6.5L18.5 9" />
      </Line>
    </svg>
  );
}

export function ChevronUpIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.8}>
        <path d="m5.5 15 6.5-6.5L18.5 15" />
      </Line>
    </svg>
  );
}

export function CopyIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <rect x="9" y="9" width="12" height="12" rx="2.5" fill="currentColor" opacity={0.13} stroke="none" />
      <Line>
        <rect x="9" y="9" width="12" height="12" rx="2.5" />
        <path d="M5.5 14.5H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 2 2v.5" />
      </Line>
    </svg>
  );
}

export function RefreshIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.7}>
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
      </Line>
    </svg>
  );
}

export function RotateIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.7}>
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </Line>
    </svg>
  );
}

export function ExternalLinkIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line>
        <path d="M14.5 3.5H21V10" />
        <path d="M10 14 21 3" />
        <path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5" />
      </Line>
    </svg>
  );
}

export function ShareIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="18" cy="5.5" r="2.7" fill="currentColor" opacity={0.16} stroke="none" />
      <circle cx="6" cy="12" r="2.7" fill="currentColor" opacity={0.16} stroke="none" />
      <circle cx="18" cy="18.5" r="2.7" fill="currentColor" opacity={0.16} stroke="none" />
      <Line>
        <circle cx="18" cy="5.5" r="2.7" />
        <circle cx="6" cy="12" r="2.7" />
        <circle cx="18" cy="18.5" r="2.7" />
        <path d="m8.5 10.7 7-3.4M8.5 13.3l7 3.4" />
      </Line>
    </svg>
  );
}

export function MessageIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" opacity={0.14} />
      <Line>
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
      </Line>
    </svg>
  );
}

export function SendIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M22 2 11 13M22 2l-7 20-4-9-9-4z" opacity={0.15} />
      <Line>
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4z" />
      </Line>
    </svg>
  );
}

export function LockIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M6 11h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z" opacity={0.15} />
      <Line>
        <rect x="4" y="11" width="16" height="9.5" rx="2" />
        <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
        <path d="M12 14.5v2.2" />
      </Line>
    </svg>
  );
}

export function MenuIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.8}>
        <path d="M4 6.8h16M4 12h16M4 17.2h16" />
      </Line>
    </svg>
  );
}

export function SearchIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="11" cy="11" r="6.6" fill="currentColor" opacity={0.1} stroke="none" />
      <Line>
        <circle cx="11" cy="11" r="6.6" />
        <path d="m20.6 20.6-4.8-4.8" />
      </Line>
    </svg>
  );
}

export function PlusIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.8}>
        <path d="M12 5v14M5 12h14" />
      </Line>
    </svg>
  );
}

export function PencilIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M17.2 3.3a2.4 2.4 0 0 1 3.4 3.4L7.6 19.7 2.7 21.3l1.6-4.9L17.2 3.3z" opacity={0.14} />
      <Line>
        <path d="M17.2 3.3a2.4 2.4 0 0 1 3.4 3.4L7.6 19.7l-4.9 1.6 1.6-4.9L17.2 3.3z" />
        <path d="m14.5 6 3.5 3.5" />
      </Line>
    </svg>
  );
}

export function TrashIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M5 6h14v13a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 19V6z" opacity={0.13} />
      <Line>
        <path d="M3.5 6.2h17" />
        <path d="M18.8 6.2V19a2.6 2.6 0 0 1-2.6 2.6H7.8A2.6 2.6 0 0 1 5.2 19V6.2" />
        <path d="M8.7 6.2V4.6A1.9 1.9 0 0 1 10.6 2.7h2.8a1.9 1.9 0 0 1 1.9 1.9v1.6" />
        <path d="M10 11v6M14 11v6" />
      </Line>
    </svg>
  );
}

export function LogOutIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M14.5 4H5.5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9" opacity={0.13} />
      <Line>
        <path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9.5" />
      </Line>
    </svg>
  );
}

export function BookIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M2.5 4h5.5a3.5 3.5 0 0 1 3.5 3.5V21a2.5 2.5 0 0 0-2.5-2.5H2.5z" opacity={0.13} />
      <Line>
        <path d="M2.5 4H8a3.5 3.5 0 0 1 3.5 3.5V21a2.5 2.5 0 0 0-2.5-2.5H2.5z" />
        <path d="M21.5 4H16a3.5 3.5 0 0 0-3.5 3.5V21a2.5 2.5 0 0 1 2.5-2.5h6.5z" />
      </Line>
    </svg>
  );
}

export function LifeBuoyIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" opacity={0.1} stroke="none" />
      <Line>
        <circle cx="12" cy="12" r="8.8" />
        <circle cx="12" cy="12" r="3.6" />
        <path d="m5.5 5.5 3.9 3.9M14.6 14.6l3.9 3.9M14.6 9.4l3.9-3.9M5.5 18.5l3.9-3.9" />
      </Line>
    </svg>
  );
}

export function ReceiptIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M6 3.5h12V21l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" opacity={0.13} />
      <Line>
        <path d="M6 3.5h12V21l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" />
        <path d="M9.3 8.5h5.4M9.3 12h5.4M9.3 15.5h3.2" />
      </Line>
    </svg>
  );
}

export function CheckSquareIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="currentColor" opacity={0.13} stroke="none" />
      <Line>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
        <path d="m8.4 12.3 2.5 2.5 4.9-5.4" />
      </Line>
    </svg>
  );
}

export function ArrowDownCircleIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" opacity={0.12} stroke="none" />
      <Line>
        <circle cx="12" cy="12" r="8.8" />
        <path d="M12 7.3v9.4" />
        <path d="m8.4 13.2 3.6 3.6 3.6-3.6" />
      </Line>
    </svg>
  );
}

export function ArrowUpCircleIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" opacity={0.12} stroke="none" />
      <Line>
        <circle cx="12" cy="12" r="8.8" />
        <path d="M12 16.7V7.3" />
        <path d="m8.4 10.8 3.6-3.6 3.6 3.6" />
      </Line>
    </svg>
  );
}

export function ScrollIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M19 17V5a2 2 0 0 0-2-2H4v15a2 2 0 1 0 4 0v-1h11z" opacity={0.12} />
      <Line>
        <path d="M19 17V5a2 2 0 0 0-2-2H4" />
        <path d="M8 21h11a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
        <path d="M15 8.5h-5M15 12h-5" />
      </Line>
    </svg>
  );
}

export function ActivityIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Line width={1.8}>
        <path d="M22 12h-3.6l-3 8.5L9 3.5l-3 8.5H2.4" />
      </Line>
    </svg>
  );
}

export function WrenchIcon({ size = 20, ...props }: DuotoneIconProps) {
  return (
    <svg {...dt(size, props)}>
      <Soft d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" opacity={0.14} />
      <Line>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </Line>
    </svg>
  );
}

/* ═══════════════════ PAYMENT NETWORK MARKS ═══════════════════ */

interface NetworkMarkProps { size?: number; className?: string }

function NetworkBase({
  from,
  to,
  children,
  size = 32,
  className,
}: { from: string; to: string; children: React.ReactNode } & NetworkMarkProps) {
  const gid = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="8" y1="6" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <circle cx="28" cy="28" r="27" fill={`url(#${gid})`} />
      <circle cx="28" cy="28" r="27" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.5" />
      <circle cx="28" cy="28" r="22.5" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="1" />
      {children}
    </svg>
  );
}

export function TonNetworkIcon({ size = 32, className }: NetworkMarkProps) {
  return (
    <NetworkBase from="#19B5FF" to="#0072C6" size={size} className={className}>
      <path
        d="M37.5 15H18.5C15.46 15 13.62 18.33 15.16 20.9L26.42 39.97C27.2 41.34 29.21 41.34 29.99 39.97L41.25 20.9C42.79 18.33 40.95 15 37.5 15Z"
        fill="#fff"
      />
      <path
        d="M28.7 15H37.5C40.95 15 42.79 18.33 41.25 20.9L30 39.97C29.6 40.66 28.94 41 28.28 41L28.7 15Z"
        fill="#fff"
        opacity="0.55"
      />
    </NetworkBase>
  );
}

export function TronNetworkIcon({ size = 32, className }: NetworkMarkProps) {
  return (
    <NetworkBase from="#FF3B47" to="#C40510" size={size} className={className}>
      <path d="M40.5 22.5 28.2 13 14 23.5l5.8 19H36.4l4.1-20z" fill="#fff" opacity="0.22" />
      <path d="M40.5 22.5 28.2 13l-7.7 8.5L36.4 26.5l4.1-4z" fill="#fff" />
      <path d="M36.4 26.5 20.5 21.5l-.7 21 16.6-16z" fill="#fff" opacity="0.6" />
    </NetworkBase>
  );
}

export function BscNetworkIcon({ size = 32, className }: NetworkMarkProps) {
  return (
    <NetworkBase from="#FFCF5C" to="#E0980A" size={size} className={className}>
      <path d="M22 28 28 22l6 6-6 6-6-6z" fill="#fff" />
      <path d="M13.5 28 17 24.5 20.5 28 17 31.5 13.5 28z" fill="#fff" opacity="0.85" />
      <path d="M35.5 28 39 24.5 42.5 28 39 31.5 35.5 28z" fill="#fff" opacity="0.85" />
      <path d="M22 19.5 25.5 16 29 19.5 25.5 23 22 19.5z" fill="#fff" opacity="0.7" />
      <path d="M22 36.5 25.5 33 29 36.5 25.5 40 22 36.5z" fill="#fff" opacity="0.7" />
    </NetworkBase>
  );
}

/** Shared switcher used by the deposit flow and any other network UI. */
export function NetworkIcon({ id, size, className }: { id: "TON" | "TRC20" | "BEP20"; size?: number; className?: string }) {
  if (id === "TON") return <TonNetworkIcon size={size} className={className} />;
  if (id === "TRC20") return <TronNetworkIcon size={size} className={className} />;
  return <BscNetworkIcon size={size} className={className} />;
}
