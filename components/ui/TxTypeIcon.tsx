"use client";

import type { CSSProperties } from "react";
import {
  AdPlayIcon,
  CheckSquareIcon,
  DepositDuotoneIcon,
  DiceIcon,
  GiftIcon,
  StarIcon,
  StreakFlameIcon,
  TrophyDuotoneIcon,
  UsersIcon,
  WithdrawDuotoneIcon,
  ZapIcon,
} from "@/components/ui/DuotoneIcons";

/**
 * Transaction / recent-activity type → Ludzo duotone mark.
 * Home recent activity aur /history dono yahi use karte hain taaki
 * lucide-style stroke paths workspace icons se mismatch na hon.
 */
type Tone = { Icon: typeof AdPlayIcon; color: string; bg: string };

function toneFor(type: string): Tone {
  const t = (type ?? "").toLowerCase();

  if (t.includes("ad")) return { Icon: AdPlayIcon, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" };
  if (t.includes("streak")) return { Icon: StreakFlameIcon, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" };
  if (t.includes("task")) return { Icon: CheckSquareIcon, color: "#10B981", bg: "rgba(16,185,129,0.12)" };
  if (t.includes("deposit") || t.includes("credit_usdt")) {
    return { Icon: DepositDuotoneIcon, color: "#10B981", bg: "rgba(16,185,129,0.12)" };
  }
  if (t.includes("withdraw")) return { Icon: WithdrawDuotoneIcon, color: "#23856C", bg: "rgba(35,133,108,0.12)" };
  if (t.includes("referral")) return { Icon: UsersIcon, color: "#23856C", bg: "rgba(35,133,108,0.12)" };
  if (t.includes("welcome") || t.includes("gift")) {
    return { Icon: GiftIcon, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" };
  }
  if (t.includes("win") || t.includes("prize") || t.includes("trophy")) {
    return { Icon: TrophyDuotoneIcon, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" };
  }
  if (t.includes("ludo") || t.includes("game") || t.includes("stake") || t.includes("match")) {
    return { Icon: DiceIcon, color: "#23856C", bg: "rgba(35,133,108,0.12)" };
  }
  if (t.includes("bonus")) return { Icon: StarIcon, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" };
  if (t.includes("admin") || t.includes("adjust")) {
    return { Icon: ZapIcon, color: "#64748B", bg: "rgba(100,116,139,0.12)" };
  }
  return { Icon: ZapIcon, color: "#64748B", bg: "rgba(100,116,139,0.12)" };
}

export default function TxTypeIcon({
  type,
  size = 16,
  box = 36,
}: {
  type: string;
  size?: number;
  box?: number;
}) {
  const { Icon, color, bg } = toneFor(type);
  const style: CSSProperties = {
    width: box,
    height: box,
    background: bg,
    border: `1px solid ${color}33`,
    color,
  };
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={style}
      aria-hidden="true"
    >
      <Icon size={size} />
    </div>
  );
}
