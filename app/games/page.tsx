"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { showToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import { useApp } from "@/hooks/useApp";
import { useRouter } from "next/navigation";
import { CoinIcon, USDTIcon, GamesIcon, TrophyIcon } from "@/components/ui/Icons";

interface GameCard {
  id: string;
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  players: string;
  entryFee: string;
  badge?: string;
  isLocked: boolean;
}

export default function GamesPage() {
  const router = useRouter();
  const { isInGamingHub, setIsInGamingHub, user } = useApp();
  const [matchmakingActive, setMatchmakingActive] = useState(false);
  const [matchmakingStep, setMatchmakingStep] = useState(0); // 0: searching, 1: found, 2: connecting, 3: launched
  const [timer, setTimer] = useState(0);

  // Automatically force Gaming Hub mode if direct navigation occurs
  useEffect(() => {
    if (!isInGamingHub) {
      setIsInGamingHub(true);
    }
  }, [isInGamingHub, setIsInGamingHub]);

  // Handle Matchmaking Simulation Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (matchmakingActive) {
      interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    } else {
      setTimer(0);
      setMatchmakingStep(0);
    }
    return () => clearInterval(interval);
  }, [matchmakingActive]);

  // Handle Matchmaking Simulation Steps
  useEffect(() => {
    if (matchmakingActive) {
      if (timer === 4) {
        setMatchmakingStep(1); // Opponent Found
      } else if (timer === 7) {
        setMatchmakingStep(2); // Connecting
      } else if (timer === 10) {
        setMatchmakingStep(3); // Match Launched
      } else if (timer === 13) {
        setMatchmakingActive(false); // Reset
        showToast("Match ready! Game room loaded.", "success");
      }
    }
  }, [timer, matchmakingActive]);

  const startMatchmaking = () => {
    setMatchmakingActive(true);
    setTimer(0);
    setMatchmakingStep(0);
  };

  const cancelMatchmaking = () => {
    setMatchmakingActive(false);
    showToast("Matchmaking cancelled.", "info");
  };

  return (
    <AppShell>
      <div className="relative min-h-screen pb-24 gaming-gradient-bg px-4 py-4 space-y-6 select-none text-white">

        {/* Ambient background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/3 right-10 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute top-2/3 left-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 space-y-5">
          {/* Page Header Row */}
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">
                Play Games
              </h1>
              <p className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest mt-0.5">
                Gaming Arena
              </p>
            </div>

            {/* Exit Button */}
            <motion.button
              onClick={() => {
                setIsInGamingHub(false);
                router.push("/home");
              }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-purple-500/40 text-purple-300 hover:text-white transition-colors"
            >
              Exit Hub
            </motion.button>
          </motion.div>

          {/* Ludo Clash Featured Game Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden border border-purple-500/40 bg-gradient-to-b from-purple-950/80 to-slate-950 shadow-[0_16px_48px_rgba(168,85,247,0.2)]"
          >
            {/* Ludo Custom SVG Artwork */}
            <div className="p-5 border-b border-purple-500/10 bg-purple-950/20 flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-radial-gradient from-purple-500/20 to-transparent pointer-events-none" />

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-purple-500/30 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.3)]">
                  <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                    <rect x="6" y="6" width="36" height="36" rx="8" fill="rgba(168,85,247,0.2)" stroke="#A855F7" strokeWidth="1.5"/>
                    <circle cx="16" cy="16" r="5" fill="#A855F7"/>
                    <circle cx="32" cy="16" r="5" fill="#3B82F6"/>
                    <circle cx="16" cy="32" r="5" fill="#10B981"/>
                    <circle cx="32" cy="32" r="5" fill="#F59E0B"/>
                    <rect x="19" y="19" width="10" height="10" rx="3" fill="rgba(168,85,247,0.5)" stroke="#A855F7" strokeWidth="1"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                      LIVE
                    </span>
                    <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-wider">
                      Stakes: 50 Coins
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1 leading-none tracking-tight">
                    Ludo Clash
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">
                    Classic 2-4 Player PvP 전략 보드게임
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 relative z-10">
                <span className="text-[10px] text-purple-400 font-bold block">ACTIVE POOL</span>
                <span className="text-sm font-black font-numeric text-amber-400 block">
                  🏆 12.8k
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Outsmart your opponents in head-to-head board battles. Rolling a 6 starts your journey—race all 4 tokens to the home triangle and pocket the winner-takes-all stakes pool!
              </p>

              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <span className="text-slate-400 font-semibold">Match Setup</span>
                <span className="text-purple-300 font-bold">1v1 PvP, 4 Tokens Each</span>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={startMatchmaking}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-[0_4px_24px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 border border-purple-400/40"
              >
                <GamesIcon size={16} />
                FIND MATCH (50 COIN ENTRY)
              </motion.button>
            </div>
          </motion.div>

          {/* Coming Soon Section */}
          <div className="space-y-3.5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400 px-0.5">
              Coming Soon Arena
            </h3>

            <div className="grid grid-cols-1 gap-3.5">

              {/* Water Sort */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/50 p-4 flex items-center justify-between group"
              >
                <div className="absolute inset-0 bg-slate-950/70 z-10 pointer-events-none" />

                <div className="flex items-center gap-3.5 relative z-20">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center opacity-60">
                    <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                      <rect x="12" y="8" width="8" height="28" rx="4" stroke="#3B82F6" strokeWidth="1.5" fill="rgba(59,130,246,0.1)"/>
                      <path d="M12 26h8M12 20h8" stroke="#3B82F6" strokeWidth="1.5"/>
                      <rect x="28" y="12" width="8" height="24" rx="4" stroke="#10B981" strokeWidth="1.5" fill="rgba(16,185,129,0.1)"/>
                      <path d="M28 28h8M28 22h8" stroke="#10B981" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-300 leading-none">
                      Water Sort
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1 max-w-[200px]">
                      Sort colored fluids into matching flasks. High focus brain puzzle.
                    </p>
                  </div>
                </div>

                <span className="relative z-20 bg-purple-950 border border-purple-500/30 text-purple-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                  Coming Soon
                </span>
              </motion.div>

              {/* Chess Duel */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/50 p-4 flex items-center justify-between group"
              >
                <div className="absolute inset-0 bg-slate-950/70 z-10 pointer-events-none" />

                <div className="flex items-center gap-3.5 relative z-20">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center opacity-60">
                    <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                      <path d="M24 8a4 4 0 00-4 4v2h8v-2a4 4 0 00-4-4z" stroke="#F59E0B" strokeWidth="1.5"/>
                      <path d="M16 18c0 4 3 6 8 6s8-2 8-6" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
                      <rect x="14" y="30" width="20" height="8" rx="2" stroke="#F59E0B" strokeWidth="1.5" fill="rgba(245,158,11,0.1)"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-300 leading-none">
                      Chess Duel
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1 max-w-[200px]">
                      Classic PvP chess matches. High intelligence strategic battles.
                    </p>
                  </div>
                </div>

                <span className="relative z-20 bg-purple-950 border border-purple-500/30 text-purple-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                  Coming Soon
                </span>
              </motion.div>

              {/* More Games */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/50 p-4 flex items-center justify-between group"
              >
                <div className="absolute inset-0 bg-slate-950/70 z-10 pointer-events-none" />

                <div className="flex items-center gap-3.5 relative z-20">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center opacity-60">
                    <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                      <circle cx="16" cy="24" r="8" stroke="#10B981" strokeWidth="1.5"/>
                      <circle cx="32" cy="24" r="8" stroke="#3B82F6" strokeWidth="1.5"/>
                      <path d="M21 21l6 6" stroke="white" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-300 leading-none">
                      More Games
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1 max-w-[200px]">
                      Carrom, Snake & Ladder, and Quiz are currently under design.
                    </p>
                  </div>
                </div>

                <span className="relative z-20 bg-purple-950 border border-purple-500/30 text-purple-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                  Coming Soon
                </span>
              </motion.div>

            </div>
          </div>
        </div>

        {/* Matchmaking Simulator Popup */}
        <AnimatePresence>
          {matchmakingActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                className="w-full max-w-sm rounded-3xl border border-purple-500/30 bg-slate-950/95 p-6 flex flex-col items-center text-center space-y-6 shadow-[0_24px_64px_rgba(168,85,247,0.3)] relative overflow-hidden"
              >
                {/* Scanner/Radar graphic */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border border-purple-500/20 border-t-purple-500"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute w-20 h-20 rounded-full border border-purple-500/10 bg-purple-500/5 flex items-center justify-center"
                  />
                  <GamesIcon size={32} className="text-purple-400 relative z-10" />
                </div>

                <div className="space-y-1.5 w-full">
                  <h3 className="text-base font-black text-white tracking-tight">
                    {matchmakingStep === 0 && "SEARCHING FOR MATCH..."}
                    {matchmakingStep === 1 && "OPPONENT FOUND!"}
                    {matchmakingStep === 2 && "CREATING BATTLE ROOM..."}
                    {matchmakingStep === 3 && "ROOM READY! INITIATING GAME..."}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium leading-tight max-w-[240px] mx-auto">
                    {matchmakingStep === 0 && "Scanning regional lobbies for available opponents with similar skill rating..."}
                    {matchmakingStep === 1 && "Opponent matched successfully! Resolving network addresses..."}
                    {matchmakingStep === 2 && "Assembling P2P game coordinates and locking stakes pool..."}
                    {matchmakingStep === 3 && "Match established! Routing to Ludo Arena (UI Only Demo)."}
                  </p>
                </div>

                {/* Player Matching Slots */}
                <div className="flex items-center justify-center gap-6 w-full">
                  {/* Local Player */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-full border border-purple-500 flex items-center justify-center text-xs font-black text-white bg-gradient-to-tr from-purple-600 to-indigo-600 ring-4 ring-purple-500/20">
                      {user?.first_name[0] ?? "U"}
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 truncate max-w-[70px]">
                      @{user?.first_name.toLowerCase() ?? "player"}
                    </span>
                  </div>

                  {/* VS Indicator */}
                  <div className="text-xs font-black text-purple-400 px-3 py-1 bg-purple-950/30 border border-purple-500/20 rounded-lg animate-pulse">
                    VS
                  </div>

                  {/* Remote Opponent Slot */}
                  <div className="flex flex-col items-center gap-1.5">
                    {matchmakingStep >= 1 ? (
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-12 h-12 rounded-full border border-blue-500 flex items-center justify-center text-xs font-black text-white bg-gradient-to-tr from-blue-600 to-cyan-600 ring-4 ring-blue-500/20"
                      >
                        S
                      </motion.div>
                    ) : (
                      <div className="w-12 h-12 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-slate-600 bg-slate-900 animate-pulse">
                        ?
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[70px]">
                      {matchmakingStep >= 1 ? "@speed_die" : "Searching..."}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-purple-500/10 w-full flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-500">Wait: {timer}s</span>
                  <span className="text-purple-400/90 font-bold">Stakes: 50 + 50 Coins</span>
                </div>

                {matchmakingStep < 3 ? (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={cancelMatchmaking}
                    className="w-full h-10 rounded-xl bg-slate-900 border border-red-500/30 hover:border-red-500/60 text-red-400 text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    CANCEL MATCHMAKING
                  </motion.button>
                ) : (
                  <div className="w-full py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-wider animate-pulse">
                    🚀 LAUNCHING GAME ROOM
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AppShell>
  );
}
