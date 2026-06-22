"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import { useRouter } from "next/navigation";
import { CoinIcon, GamesIcon, TrophyIcon } from "@/components/ui/Icons";

export default function GamesPage() {
  const router = useRouter();
  const { isInGamingHub, setIsInGamingHub, wallet, recordMatchResult, updateWalletBalances } = useApp();

  // Matchmaker states
  const [matchmakingActive, setMatchmakingActive] = useState(false);
  const [matchmakingStep, setMatchmakingStep] = useState(0); // 0: searching, 1: found, 2: connecting, 3: loading gameplay
  const [timer, setTimer] = useState(0);

  // Gameplay simulation states (match visual simulation)
  const [gameplayActive, setGameplayActive] = useState(false);
  const [gameLogs, setGameLogs] = useState<string[]>([]);
  const [currentRoll, setCurrentRoll] = useState<number | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [gameTimer, setGameTimer] = useState(0);
  const [isWinner, setIsWinner] = useState(true);
  const [gameResolved, setGameResolved] = useState(false);

  // Automatically force Gaming Hub mode if direct navigation occurs
  useEffect(() => {
    if (!isInGamingHub) {
      setIsInGamingHub(true);
    }
  }, [isInGamingHub, setIsInGamingHub]);

  // Matchmaking process timers
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (matchmakingActive) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const next = prev + 1;
          if (next === 4) {
            setMatchmakingStep(1); // Opponent Found
          } else if (next === 7) {
            setMatchmakingStep(2); // Connecting Room
          } else if (next === 10) {
            setMatchmakingStep(3); // Match Loaded
          } else if (next === 12) {
            clearInterval(interval);
            setMatchmakingActive(false);
            // Launch Simulated Gameplay directly inside the Play tab
            launchGameSimulation();
          }
          return next;
        });
      }, 1000);
    } else {
      setTimer(0);
      setMatchmakingStep(0);
    }
    return () => clearInterval(interval);
  }, [matchmakingActive]);

  // Simulated Game Progress Timers
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameplayActive && !gameResolved) {
      interval = setInterval(() => {
        setGameTimer((prev) => {
          const next = prev + 1;

          // Simulated dice rolling and game turn logs
          if (next === 1) {
            setCurrentRoll(6);
            setGameLogs((prevLogs) => [...prevLogs, "🎲 Roll 1: You rolled 6! Token released from Home Yard."]);
            setIsMyTurn(false);
          } else if (next === 3) {
            setCurrentRoll(4);
            setGameLogs((prevLogs) => [...prevLogs, "🎲 Roll 2: Opponent @speed_die rolled 4."]);
            setIsMyTurn(true);
          } else if (next === 5) {
            setCurrentRoll(6);
            setGameLogs((prevLogs) => [...prevLogs, "⚔️ Roll 3: You captured @speed_die's token at the Star safe spot! 🔥"]);
            setIsMyTurn(false);
          } else if (next === 7) {
            setCurrentRoll(5);
            setGameLogs((prevLogs) => [...prevLogs, "🏃 Roll 4: Opponent @speed_die is racing toward the home path."]);
            setIsMyTurn(true);
          } else if (next === 9) {
            setCurrentRoll(3);
            // Decide winner (60% win chance for demo)
            const won = Math.random() < 0.6;
            setIsWinner(won);
            if (won) {
              setGameLogs((prevLogs) => [...prevLogs, "🏆 Roll 5: You rolled 3 and successfully entered the central triangle! Victory!"]);
            } else {
              setGameLogs((prevLogs) => [...prevLogs, "💥 Roll 5: Opponent rolled 1 and cut your token at the home stretch! Defeat!"]);
            }
            setGameResolved(true);
          }
          return next;
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [gameplayActive, gameResolved]);

  const startMatchmaking = () => {
    const balance = wallet?.coin_balance ?? 0;
    if (balance < 50) {
      showToast("Insufficient Coins. You need at least 50 Coins to register.", "error");
      return;
    }

    // Deduct 50 Coins stake immediately on matchmaking entry (connection back to main dashboard)
    updateWalletBalances(-50, 0, 0);
    showToast("50 Coins stake registered. Matchmaking initiated.", "info");

    setMatchmakingActive(true);
    setTimer(0);
    setMatchmakingStep(0);
  };

  const cancelMatchmaking = () => {
    setMatchmakingActive(false);
    // Refund the entry fee upon cancellation
    updateWalletBalances(50, 0, 0);
    showToast("Matchmaking cancelled. Stake refunded.", "info");
  };

  const launchGameSimulation = () => {
    setGameplayActive(true);
    setGameResolved(false);
    setGameTimer(0);
    setGameLogs(["🏁 Game started. 1v1 PvP Board matches loaded against @speed_die.", "🎲 Rolling dice to decide starting turns..."]);
  };

  const collectGameRewardsAndExit = () => {
    // Commit the matchmaking game rewards/results to global state (main wallet & pro statistics)
    recordMatchResult(isWinner, 50);

    // Close gameplay screens
    setGameplayActive(false);
    setGameResolved(false);
    setGameLogs([]);
    setGameTimer(0);

    showToast(isWinner ? "Victory rewards credited to dashboard!" : "Match stats saved to history.", isWinner ? "success" : "info");
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
                Play Arena
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
            {/* Realistic Ludo Board SVG Artwork */}
            <div className="p-5 border-b border-purple-500/10 bg-purple-950/20 flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-radial-gradient from-purple-500/20 to-transparent pointer-events-none" />

              <div className="flex items-center gap-4 relative z-10">
                {/* Stunning Ludo Board Mini Icon */}
                <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-purple-500/40 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.3)]">
                  <svg width="46" height="40" viewBox="0 0 100 100" fill="none">
                    <rect width="100" height="100" rx="12" fill="#0F172A" stroke="#334155" strokeWidth="2.5"/>
                    <rect x="6" y="6" width="34" height="36" rx="4" fill="#EF4444" stroke="#fff" strokeWidth="1.5"/>
                    <rect x="60" y="6" width="34" height="36" rx="4" fill="#22C55E" stroke="#fff" strokeWidth="1.5"/>
                    <rect x="6" y="58" width="34" height="36" rx="4" fill="#EAB308" stroke="#fff" strokeWidth="1.5"/>
                    <rect x="60" y="58" width="34" height="36" rx="4" fill="#3B82F6" stroke="#fff" strokeWidth="1.5"/>
                    <polygon points="50,50 40,40 60,40" fill="#22C55E"/>
                    <polygon points="50,50 40,60 60,60" fill="#EAB308"/>
                    <polygon points="50,50 40,40 40,60" fill="#EF4444"/>
                    <polygon points="50,50 60,40 60,60" fill="#3B82F6"/>
                    <rect x="40" y="40" width="20" height="20" stroke="#fff" strokeWidth="1"/>
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
                    Head-to-head multiplayer board battles
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 relative z-10 font-numeric">
                <span className="text-[9px] text-purple-400 font-bold block">ACTIVE POOLS</span>
                <span className="text-xs font-black text-amber-400 block">
                  🏆 10.8k Coins
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Outsmart your opponent in real-time. Roll the dice, capture enemy tokens at safe zones, and race all four pegs to the home center to claim the entire stakes pool!
              </p>

              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <span className="text-slate-400 font-semibold">Match Setup</span>
                <span className="text-purple-300 font-bold">1v1 Real-Time PvP Arena</span>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={startMatchmaking}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-[0_4px_24px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 border border-purple-400/40"
              >
                <GamesIcon size={16} />
                REGISTER MATCH (50 COIN ENTRY)
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

            </div>
          </div>
        </div>

        {/* --- MATCHMAKING SIMULATOR OVERLAY --- */}
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
                className="w-full max-w-sm rounded-3xl border border-purple-500/30 bg-slate-950/95 p-6 flex flex-col items-center text-center space-y-6 shadow-[0_24px_64px_rgba(168,85,247,0.35)] relative overflow-hidden"
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
                  <GamesIcon size={32} className="text-purple-400 relative z-10 animate-pulse" />
                </div>

                <div className="space-y-1.5 w-full">
                  <h3 className="text-base font-black text-white tracking-tight">
                    {matchmakingStep === 0 && "SEARCHING FOR MATCH..."}
                    {matchmakingStep === 1 && "OPPONENT MATCHED!"}
                    {matchmakingStep === 2 && "SECURED MATCH Coordinates..."}
                    {matchmakingStep === 3 && "LOBBY ESTABLISHED! INITIATING..."}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-tight max-w-[240px] mx-auto">
                    {matchmakingStep === 0 && "Scanning lobbies for active opponents with similar skill rating..."}
                    {matchmakingStep === 1 && "Opponent found! Establishing secure P2P game server..."}
                    {matchmakingStep === 2 && "Deducting 50 Coin entry stakes and creating prize pool..."}
                    {matchmakingStep === 3 && "Assembling Ludo Clash board components. Synchronizing pegs..."}
                  </p>
                </div>

                {/* Player Matching Slots */}
                <div className="flex items-center justify-center gap-6 w-full">
                  {/* Local Player */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-full border border-purple-500 flex items-center justify-center text-xs font-black text-white bg-gradient-to-tr from-purple-600 to-indigo-600 ring-4 ring-purple-500/20">
                      P
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-300 truncate max-w-[70px]">
                      @gamer
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
                    <span className="text-[10px] font-extrabold text-slate-400 truncate max-w-[70px]">
                      {matchmakingStep >= 1 ? "@speed_die" : "Searching..."}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-purple-500/10 w-full flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-500 font-bold">Lobby Timer: {timer}s</span>
                  <span className="text-purple-400/90 font-black">Stakes: 100 Coin Pool</span>
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
                    🚀 INITIATING BOARD LOBBY
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- FULLY INTEGRATED GAMEPLAY SESSION SIMULATOR --- */}
        <AnimatePresence>
          {gameplayActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-4 text-white"
            >
              <div className="w-full max-w-sm flex flex-col space-y-5 h-full max-h-[640px]">

                {/* Header info */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider">Ludo Clash Game Arena</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Room #L{Math.floor(Math.random()*9000)+1000}</span>
                </div>

                {/* Score panel */}
                <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs font-bold">
                  <div className="text-left">
                    <span className="text-slate-500 text-[9px] uppercase tracking-wide block">Local pegs</span>
                    <span className="text-purple-300 font-extrabold flex items-center gap-1">🔴 You (Home: 3/4)</span>
                  </div>
                  <div className="px-2.5 py-1 bg-purple-950/40 border border-purple-500/20 rounded text-[9px] font-black text-purple-400 uppercase tracking-widest animate-pulse">
                    Match Live
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[9px] uppercase tracking-wide block">Opponent pegs</span>
                    <span className="text-blue-300 font-extrabold flex items-center gap-1">🔵 @speed_die (Home: 3/4)</span>
                  </div>
                </div>

                {/* Spectacular Ludo Board Simulator GUI */}
                <div className="relative aspect-square w-full max-w-sm rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 p-2 shadow-2xl flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                    <rect width="100" height="100" fill="#1E293B" />

                    {/* Grid pathways */}
                    <rect x="40" y="0" width="20" height="40" fill="#334155" opacity="0.3"/>
                    <rect x="0" y="40" width="40" height="20" fill="#334155" opacity="0.3"/>
                    <rect x="60" y="40" width="40" height="20" fill="#334155" opacity="0.3"/>
                    <rect x="40" y="60" width="20" height="40" fill="#334155" opacity="0.3"/>

                    {/* Ludo Quad Red */}
                    <rect x="2" y="2" width="38" height="38" rx="6" fill="#EF4444" stroke="#fff" strokeWidth="1"/>
                    <rect x="10" y="10" width="22" height="22" rx="4" fill="#fff" />
                    <circle cx="15" cy="15" r="4" fill="#EF4444" className={isMyTurn ? "animate-pulse" : ""}/>
                    <circle cx="27" cy="27" r="4" fill="#EF4444"/>

                    {/* Ludo Quad Green */}
                    <rect x="60" y="2" width="38" height="38" rx="6" fill="#22C55E" stroke="#fff" strokeWidth="1"/>
                    <rect x="68" y="10" width="22" height="22" rx="4" fill="#fff" />
                    <circle cx="73" cy="15" r="4" fill="#22C55E"/>
                    <circle cx="85" cy="27" r="4" fill="#22C55E"/>

                    {/* Ludo Quad Yellow */}
                    <rect x="2" y="60" width="38" height="38" rx="6" fill="#EAB308" stroke="#fff" strokeWidth="1"/>
                    <rect x="10" y="68" width="22" height="22" rx="4" fill="#fff" />
                    <circle cx="15" cy="73" r="4" fill="#EAB308"/>
                    <circle cx="27" cy="85" r="4" fill="#EAB308"/>

                    {/* Ludo Quad Blue */}
                    <rect x="60" y="60" width="38" height="38" rx="6" fill="#3B82F6" stroke="#fff" strokeWidth="1"/>
                    <rect x="68" y="68" width="22" height="22" rx="4" fill="#fff" />
                    <circle cx="73" cy="73" r="4" fill="#3B82F6" className={!isMyTurn ? "animate-pulse" : ""}/>
                    <circle cx="85" cy="85" r="4" fill="#3B82F6"/>

                    {/* Center safe spots */}
                    <polygon points="50,50 40,40 60,40" fill="#22C55E" stroke="#fff" strokeWidth="0.5"/>
                    <polygon points="50,50 40,60 60,60" fill="#EAB308" stroke="#fff" strokeWidth="0.5"/>
                    <polygon points="50,50 40,40 40,60" fill="#EF4444" stroke="#fff" strokeWidth="0.5"/>
                    <polygon points="50,50 60,40 60,60" fill="#3B82F6" stroke="#fff" strokeWidth="0.5"/>

                    {/* Safe zone stars */}
                    <path d="M46 15l2 2-2 2-2-2z" fill="#fff" />
                    <path d="M15 54l2 2-2 2-2-2z" fill="#fff" />
                    <path d="M85 46l2 2-2 2-2-2z" fill="#fff" />
                    <path d="M54 85l2 2-2 2-2-2z" fill="#fff" />

                    {/* Interactive Active Die */}
                    <g transform="translate(42, 42)">
                      <rect width="16" height="16" rx="3" fill="#A855F7" stroke="#fff" strokeWidth="1" />
                      {/* Dots on die based on turns */}
                      <circle cx="8" cy="8" r="2.5" fill="#fff" />
                    </g>
                  </svg>

                  {/* Turn indicator banner */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/80 border border-purple-500/20 py-1.5 px-4 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                    {isMyTurn ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" />
                        <span>YOUR TURN...</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        <span>OPPONENT THINKING...</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Console Log Ticker Display */}
                <div className="flex-1 bg-slate-950/70 rounded-2xl border border-slate-800 p-4 font-mono text-[10px] text-purple-300 leading-relaxed overflow-y-auto space-y-1 scrollbar-none h-24">
                  {gameLogs.map((log, idx) => (
                    <div key={idx} className="transition-opacity duration-200">
                      {log}
                    </div>
                  ))}
                </div>

                {/* Outcome resolution displays */}
                {gameResolved ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-5 rounded-2xl border border-slate-800 bg-slate-900 text-center space-y-4 shadow-xl relative overflow-hidden"
                  >
                    {isWinner ? (
                      <>
                        {/* Winner Fireworks display */}
                        <div className="absolute inset-0 pointer-events-none opacity-20 bg-radial-gradient from-emerald-500 to-transparent" />
                        <h4 className="text-xl font-black text-emerald-400 tracking-tight animate-bounce">
                          VICTORY OVERSPEED!
                        </h4>
                        <p className="text-xs text-slate-300 max-w-[280px] mx-auto leading-normal">
                          You cleared all 4 tokens! Opponent @speed_die surrendered. You are awarded the prize pool!
                        </p>
                        <div className="flex justify-center gap-4 text-xs font-black">
                          <div className="px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-1 font-numeric">
                            <CoinIcon size={14} className="text-amber-400" />
                            +100 Coins
                          </div>
                          <div className="px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-1 font-numeric">
                            <TrophyIcon size={14} className="text-purple-400" />
                            +50 Won Coins
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="text-xl font-black text-red-500 tracking-tight">
                          DEFEAT AT FINISH!
                        </h4>
                        <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-normal">
                          You ran out of moves on the final leg. Opponent @speed_die locked the stakes pool.
                        </p>
                        <div className="flex justify-center gap-2 text-xs font-bold text-red-400">
                          <span>Stakes lost:</span>
                          <span className="font-black font-numeric">-50 Coins</span>
                        </div>
                      </>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={collectGameRewardsAndExit}
                      className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-widest border border-purple-400/20 shadow-lg mt-2"
                    >
                      {isWinner ? "COLLECT REWARDS & EXIT" : "RETURN TO LOBBY"}
                    </motion.button>
                  </motion.div>
                ) : (
                  // Linear progress bar for Match gameplay simulation
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      <span>Simulating Board Plays...</span>
                      <span>Progress: {Math.round((gameTimer / 9) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
                      <motion.div
                        className="h-full bg-purple-600 rounded-full shadow-[0_0_8px_#A855F7]"
                        style={{ width: `${(gameTimer / 9) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AppShell>
  );
}
