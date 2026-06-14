// Custom SVG icon set for Ludzo — replaces all emoji usage
// All icons share 1.5px stroke width and unified design language

import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, props: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export function RewardIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function TaskIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

export function CoinIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 8v8h4" />
      <path d="M9 12h4" />
      <path d="M15 13.5l1.5-1.5-1.5-1.5" strokeWidth={1} />
    </svg>
  );
}

export function WalletIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M16 13h.01" strokeWidth={2} />
      <path d="M2 10h20" />
    </svg>
  );
}

export function USDTIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M8 9h8M9 12h6" />
    </svg>
  );
}

export function WithdrawalIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 2v10M8 8l4 4 4-4" />
      <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
    </svg>
  );
}

export function ReferralIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function LeaderboardIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <rect x="18" y="3" width="4" height="18" rx="1" />
      <rect x="10" y="8" width="4" height="13" rx="1" />
      <rect x="2" y="13" width="4" height="8" rx="1" />
    </svg>
  );
}

export function GamesIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <rect x="2" y="6" width="20" height="12" rx="4" />
      <path d="M6 12h4M8 10v4" />
      <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AdsIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

export function ProfileIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function SettingsIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export function NotificationIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

export function DailyStreakIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z" fill="currentColor" stroke="none" opacity="0.2" />
      <path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z" />
      <path d="M9 13c0 0 1 2 3 2s3-2 3-2" />
    </svg>
  );
}

export function HomeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function DepositIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 22V12M8 16l4-4 4 4" />
      <path d="M4 10V6a2 2 0 012-2h12a2 2 0 012 2v4" />
    </svg>
  );
}

export function WarningIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function ShareIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function TrophyIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0012 0V2z" />
    </svg>
  );
}

export function ClockIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function AnnouncementIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.11 .2a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

// ── Legal Center icon set ────────────────────────────────────────────────

export function LegalIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 2v20" />
      <path d="M5 22h14" />
      <path d="M5 6h14" />
      <path d="M5 6L2 12a3 3 0 006 0L5 6z" />
      <path d="M19 6l-3 6a3 3 0 006 0l-3-6z" />
    </svg>
  );
}

export function TermsIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6M9 9h1" />
    </svg>
  );
}

export function PrivacyShieldIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
      <rect x="9" y="11" width="6" height="5" rx="1" />
      <path d="M10.5 11V9.5a1.5 1.5 0 013 0V11" />
    </svg>
  );
}

export function ResponsibleGamingIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78l1.06 1.06L12 21l7.78-7.55 1.06-1.06a5.5 5.5 0 000-7.78z" />
      <path d="M7.5 12h2l1.5-2.5 2 4 1.5-2.5h2" />
    </svg>
  );
}

export function RefundIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M3 10a9 9 0 0115.5-5.5L21 7" />
      <path d="M21 3v5h-5" />
      <path d="M21 14a9 9 0 01-15.5 5.5L3 17" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export function AMLShieldIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function FairPlayIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M4 22V4" />
      <path d="M4 4h13l-2 4 2 4H4" />
      <path d="M9 6.5l1 1 2-2" />
    </svg>
  );
}

export function SupportDisputesIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M4.93 19.07l4.24-4.24" />
    </svg>
  );
}

export function FaqIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}
