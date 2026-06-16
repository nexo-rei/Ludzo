import React, { useState } from 'react';
import { motion } from 'motion/react';
import { EmptyState } from '@/components/games/matches/EmptyState';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MatchesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('live');

  return (
    <div className="flex flex-col pt-4">
      <div className="px-4 mb-4">
        <h1 className="text-xl font-bold text-foreground mb-1">Matches</h1>
        <p className="text-sm text-muted-foreground">Track your game activity</p>
      </div>

      <div className="px-4 mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-11 bg-muted rounded-xl p-1">
            <TabsTrigger
              value="live"
              className="rounded-lg text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Live
            </TabsTrigger>
            <TabsTrigger
              value="recent"
              className="rounded-lg text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Recent
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-lg text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              History
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="px-4"
      >
        {activeTab === 'live' && (
          <div className="rounded-2xl bg-card border border-border">
            <EmptyState type="live" />
          </div>
        )}
        {activeTab === 'recent' && (
          <div className="rounded-2xl bg-card border border-border">
            <EmptyState type="recent" />
          </div>
        )}
        {activeTab === 'history' && (
          <div className="rounded-2xl bg-card border border-border">
            <EmptyState type="history" />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MatchesPage;
