import React from 'react';
import { motion } from 'motion/react';
import { Gamepad2, Trophy, Zap, Star, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const FUTURE_GAMES = [
  { label: '100 Coin Match', coins: 100, icon: Zap, color: 'text-blue-400' },
  { label: '500 Coin Match', coins: 500, icon: Star, color: 'text-purple-400' },
  { label: '1000 Coin Match', coins: 1000, icon: Trophy, color: 'text-yellow-400' },
  { label: 'Tournament Mode', coins: null, icon: Trophy, color: 'text-orange-400' },
];

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-foreground">Games</h1>
        </div>
      </div>

      <div className="px-4 py-8 max-w-lg mx-auto flex flex-col items-center gap-6">
        {/* Hero */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center glow-primary">
            <Gamepad2 className="w-12 h-12 text-primary" />
          </div>
          <div className="text-center">
            <Badge variant="secondary" className="mb-2 text-xs">Coming Soon</Badge>
            <h2 className="text-2xl font-bold text-foreground text-balance">Skill-Based Games</h2>
            <p className="text-sm text-muted-foreground mt-2 text-pretty max-w-xs">
              Compete with players worldwide and win USDT rewards using your Coins.
            </p>
          </div>
        </motion.div>

        {/* Future features */}
        <div className="w-full grid grid-cols-2 gap-3">
          {FUTURE_GAMES.map(({ label, coins, icon: Icon, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-2 relative overflow-hidden"
            >
              <div className="absolute top-2 right-2">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <Icon className={`w-6 h-6 ${color}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                {coins && (
                  <p className="text-xs text-muted-foreground">{coins} Coins entry</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full"
        >
          <div className="rounded-2xl bg-primary/5 border border-primary/15 p-5 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Start earning Coins now so you&apos;re ready when games launch!
            </p>
            <Button variant="outline" className="gap-2" onClick={() => window.history.back()}>
              <Zap className="w-4 h-4" />
              Earn Coins Now
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
