"use client";
import SymbolIcon from "@/components/ui/SymbolIcon";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BookIcon,
  CrownIcon,
  ChevronRightIcon,
  LifeBuoyIcon,
  LogOutIcon,
  ReceiptIcon,
  RotateIcon,
  SettingsNavIcon,
  TrophyDuotoneIcon,
} from "@/components/ui/DuotoneIcons";
import { useApp } from "@/hooks/useApp";
import { CoinIcon } from "@/components/ui/Icons";
import { showToast } from "@/components/ui/Toast";
import Sheet from "@/components/ui/Sheet";
import { BattleLogIcon, DiceIcon, TokenIcon, LudoIcon } from "@/components/gaming/GamingIcons";

interface Stats {
  wins: number;
  losses: number;
  total_matches: number;
  win_rate: string;
  current_streak: number;
  best_streak: number;
  total_won_coins: number;
}

const EMPTY_STATS: Stats = {
  wins: 0, losses: 0, total_matches: 0, win_rate: "0%",
  current_streak: 0, best_streak: 0, total_won_coins: 0,
};

interface MenuItem {
  labelKey: string;
  hintKey: string;
  href?: string;
  action?: "rules" | "support" | "exit";
  tint: string;
  Icon: React.ComponentType<{ size?: number; className?: string; active?: boolean }>;
}

export default function GamingProfilePage() {
  const router = useRouter();
  const { user, userId, wallet, refreshWallet, t } = useApp();

  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const RULES = [
    { icon: "dice", text: t("ludo_how_to_play") },
    { icon: "target", text: t("ludo_desc") },
    { icon: "repeat", text: t("daily_streak") },
    { icon: "warning", text: t("important_notice") },
    { icon: "shield", text: t("fair_play") },
    { icon: "⏱️", text: "18s / turn, 8 min cap, 3 hearts" },
  ];

  const MENU: MenuItem[] = [
    { labelKey: "battle_history",  hintKey: "arena_recent_battles", href: "/games/matches", tint: "#63D9B4", Icon: BattleLogIcon },
    { labelKey: "leaderboard_title", hintKey: "top_earners",   href: "/leaderboard",   tint: "#F59E0B", Icon: TrophyDuotoneIcon },
    { labelKey: "how_to_play",     hintKey: "how_it_works",       action: "rules",        tint: "#3B82F6", Icon: BookIcon },
    { labelKey: "history_title",    hintKey: "recent_activity",  href: "/history",       tint: "#10B981", Icon: ReceiptIcon },
    { labelKey: "settings_title",   hintKey: "language_setting",   href: "/settings",      tint: "#94A3B8", Icon: SettingsNavIcon },
    { labelKey: "support_title",    hintKey: "chat_support",    action: "support",      tint: "#22D3EE", Icon: LifeBuoyIcon },
    { labelKey: "exit_hub",         hintKey: "nav_home",      action: "exit",         tint: "#F97316", Icon: LogOutIcon },
  ];

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/ludo/stats", {
        headers: { "Authorization": `Bearer ${userId}`, "x-user-id": userId },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) setStats({ ...EMPTY_STATS, ...(json.data.stats ?? {}) });
      }
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (userId) refreshWallet(); }, [userId, refreshWallet]);

  const handleRefresh = () => {
    setRefreshing(true);
    refreshWallet();
    load();
  };

  const handleMenuAction = (item: MenuItem) => {
    if (item.action === "rules") { setRulesOpen(true); return; }
    if (item.action === "support") {
      showToast("Opening Ludzo support…", "info");
      window.open("https://t.me/ludzo_support", "_blank");
      return;
    }
    if (item.action === "exit") { router.push("/home"); return; }
  };

  const coins     = wallet?.coin_balance ?? 0;
  const wonCoins  = wallet?.won_coins_balance ?? 0;
  const usdt      = wallet?.usdt_balance ?? 0;
  const hasPlayed = stats.total_matches > 0;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-16 left-1/4 h-56 w-56 rounded-full bg-purple-600/20 blur-3xl"
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-app px-4 pt-4 space-y-4 hub-pad-bottom-lg select-none">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-3"
        >
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-50">{t("game_profile")}</h1>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-purple-400">
              Pro Identity
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.92, rotate: -25 }}
            onClick={handleRefresh}
            aria-label="Refresh profile"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/35 bg-slate-900/70 text-purple-300"
          >
            <RotateIcon size={15} className={refreshing ? "animate-spin" : ""} />
          </motion.button>
        </motion.div>

        {/* ── Identity card ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="surface-glass relative overflow-hidden rounded-3xl p-5"
        >
          <div className="pointer-events-none absolute -right-6 -top-8 opacity-[0.12]">
            <LudoIcon size={130} className="text-purple-300" />
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="relative h-16 w-16 flex-none overflow-hidden rounded-2xl border-2 border-purple-500/60 bg-slate-900 shadow-[0_0_20px_rgba(99,217,180,0.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user?.photo_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId ?? "me"}`}
                alt="Avatar"
                className="h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId ?? "me"}`; }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 text-base font-black tracking-tight text-white">
                <span className="truncate">{user?.first_name ?? "Player"}</span>
                <span className="flex-none rounded border border-purple-500/30 bg-purple-600/25 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-purple-300">
                  Pro
                </span>
              </h2>
              {user?.username && (
                <p className="mt-0.5 truncate text-[11px] font-bold text-purple-300">@{user.username}</p>
              )}
              <p className="mt-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-400">
                <CrownIcon size={11} /> {stats.best_streak} best streak
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Wallet ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-2.5"
        >
          <div className="surface-glass rounded-2xl px-4 py-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t("playable_coins")}</span>
            <div className="mt-1 flex items-center gap-1.5">
              <CoinIcon size={16} className="text-amber-400" />
              <span className="text-lg font-black tabular-nums text-white">{coins.toLocaleString()}</span>
            </div>
          </div>

          <div className="surface-glass rounded-2xl px-4 py-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-300">{t("won_coins_title")}</span>
            <div className="mt-1 flex items-center gap-1.5">
              <TokenIcon size={16} className="text-purple-300" />
              <span className="text-lg font-black tabular-nums text-purple-300">{wonCoins.toLocaleString()}</span>
            </div>
          </div>

          <div className="surface-glass col-span-2 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Protected funds · 100 {t("won_coins")} = $0.50
            </span>
            <span className="font-mono text-sm font-black text-emerald-400">${usdt.toFixed(2)} locked</span>
          </div>
        </motion.div>

        {/* ── Statistics ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-2.5"
        >
          <div className="flex items-end justify-between px-0.5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-300">
              Gaming Statistics
            </h3>
            {loading && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{t("loading")}</span>}
          </div>

          {!hasPlayed && !loading ? (
            <div className="surface-glass flex flex-col items-center gap-3 rounded-3xl px-5 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-300">
                <DiceIcon size={26} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-200">{t("arena_no_battles")}</h4>
                <p className="mx-auto mt-1 max-w-[230px] text-[10px] font-medium leading-relaxed text-slate-500">
                  {t("arena_no_battles_desc")}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => router.push("/games")}
                className="h-9 rounded-xl border border-purple-400/40 bg-gradient-to-r from-purple-600 to-indigo-600 px-4 text-[10px] font-black uppercase tracking-widest text-white"
              >
                {t("arena_play_now")}
              </motion.button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: t("arena_battles"), value: stats.total_matches, tone: "text-slate-100" },
                  { label: t("arena_wins"), value: stats.wins, tone: "text-emerald-400" },
                  { label: t("failed"), value: stats.losses, tone: "text-red-400" },
                ].map((cell, i) => (
                  <motion.div
                    key={cell.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.18 + i * 0.04 }}
                    className="surface-glass rounded-2xl px-3 py-3.5 text-center"
                  >
                    <span className={`block text-base font-black tabular-nums ${cell.tone}`}>{cell.value}</span>
                    <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">
                      {cell.label}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: t("arena_win_rate"), value: stats.win_rate, tone: "text-purple-300" },
                  { label: "Streak", value: `${stats.current_streak}`, tone: "text-amber-400" },
                  { label: "Best", value: `${stats.best_streak}`, tone: "text-amber-400" },
                ].map((cell, i) => (
                  <motion.div
                    key={cell.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                    className="surface-glass rounded-2xl px-3 py-3.5 text-center"
                  >
                    <span className={`block text-sm font-black tabular-nums ${cell.tone}`}>{cell.value}</span>
                    <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">
                      {cell.label}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-purple-500/5 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-amber-300/90">
                      Total Won Coins earned
                    </span>
                    <motion.span
                      key={stats.total_won_coins}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 block text-xl font-black tabular-nums text-amber-400"
                    >
                      {stats.total_won_coins.toLocaleString()}
                    </motion.span>
                  </div>
                  <TokenIcon size={30} className="text-amber-400/90" />
                </div>
              </motion.div>
            </>
          )}
        </motion.div>

        {/* ── Menu (Matches + everything else) ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2.5"
        >
          <h3 className="px-0.5 text-[10px] font-black uppercase tracking-widest text-purple-300">
            Arena Options
          </h3>

          <div className="surface-glass divide-y divide-slate-800/70 overflow-hidden rounded-3xl">
            {MENU.map((item, i) => {
              const Icon = item.Icon;
              const inner = (
                <div className="flex items-center gap-3.5 px-4 py-3.5">
                  <span
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
                    style={{ background: `${item.tint}1F`, border: `1px solid ${item.tint}33`, color: item.tint }}
                  >
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-extrabold text-slate-100">{t(item.labelKey)}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-500">{t(item.hintKey)}</span>
                  </span>
                  <ChevronRightIcon size={16} className="flex-none text-slate-500" />
                </div>
              );

              return (
                <motion.div
                  key={item.labelKey}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.24 + i * 0.04 }}
                >
                  {item.href ? (
                    <Link href={item.href} className="block transition-colors hover:bg-white/5 active:bg-white/10">
                      {inner}
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleMenuAction(item)}
                      className="block w-full text-left transition-colors hover:bg-white/5 active:bg-white/10"
                    >
                      {inner}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <p className="px-1 pt-1 text-center text-[9px] font-bold uppercase tracking-widest text-slate-600">
          LUDZO Arena · Pro Division
        </p>
      </div>

      {/* ── RULES SHEET ────────────────────────────────────────────────────── */}
      <Sheet
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title={t("how_to_play")}
        subtitle="Two tokens, one roll at a time — first to bring both home wins the pool."
        footer={
          <button
            type="button"
            onClick={() => { setRulesOpen(false); router.push("/games"); }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
          >
            <DiceIcon size={16} />
            {t("enter_arena")}
          </button>
        }
      >
        <div className="space-y-2">
          {RULES.map((rule, i) => (
            <motion.div
              key={rule.text}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.24 }}
              className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5"
              style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
            >
              <span className="mt-0.5 flex-none text-[var(--accent)]">
                <SymbolIcon name={rule.icon} size={17} />
              </span>
              <span className="text-[12px] font-medium leading-snug text-[var(--text-secondary)]">{rule.text}</span>
            </motion.div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
