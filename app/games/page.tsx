"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { LudoIcon, PlayIcon } from "@/components/gaming/GamingIcons";
import EconomyCard from "@/components/gaming/EconomyCard";
import ActivePlayers from "@/components/gaming/ActivePlayers";
import WinnersSection from "@/components/gaming/WinnerCard";
import AnnouncementsSection from "@/components/gaming/AnnouncementCard";
import LudoModesPreview from "@/components/gaming/LudoModesPreview";

// Mock Telegram user data — replace with useTelegram hook in production
const TELEGRAM_USER = {
  username: "LudzoPlayer",
  firstName: "Alex",
  lastName: "",
  avatar: undefined as string | undefined,
};

function ProfileHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-3"
    >
      {TELEGRAM_USER.avatar ? (
        <img
          src={TELEGRAM_USER.avatar}
          alt={TELEGRAM_USER.username}
          className="h-11 w-11 rounded-full object-cover border-2 border-gaming-border/50"
        />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gaming-primary/10 border-2 border-gaming-primary/20 text-gaming-primary text-sm font-bold">
          {TELEGRAM_USER.firstName?.[0]?.toUpperCase() ?? "L"}
        </div>
      )}
      <div>
        <p className="text-sm font-bold text-gaming-foreground">
          {TELEGRAM_USER.firstName || TELEGRAM_USER.username}
        </p>
        <p className="text-xs text-gaming-muted">@{TELEGRAM_USER.username}</p>
      </div>
    </motion.div>
  );
}

function PlayLudoCTA() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.45 }}
    >
      <Link
        href="/games/play"
        className="group relative block overflow-hidden rounded-2xl border border-gaming-primary/30 bg-gradient-to-br from-gaming-primary/15 via-gaming-primary/8 to-transparent p-5"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-gaming-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gaming-primary/10 text-gaming-primary">
            <LudoIcon size={40} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gaming-foreground">Play Ludo</h2>
            <p className="text-xs text-gaming-muted mt-0.5">Classic board game, real rewards</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gaming-primary text-white shadow-sm group-hover:scale-105 transition-transform">
            <PlayIcon size={18} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function GamingHomePage() {
  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-[480px] px-4 pt-5 pb-6 space-y-5">
        {/* Profile Header */}
        <ProfileHeader />

        {/* Economy Card */}
        <EconomyCard compact />

        {/* Play Ludo CTA */}
        <PlayLudoCTA />

        {/* Active Players */}
        <ActivePlayers />

        {/* Ludo Modes Preview */}
        <LudoModesPreview />

        {/* Recent Winners */}
        <WinnersSection />

        {/* Announcements */}
        <AnnouncementsSection />
      </div>
    </div>
  );
}
