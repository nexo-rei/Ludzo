import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Coins, DollarSign, ArrowDownCircle, ArrowUpCircle, History, Palette, Globe, Bell, HelpCircle, Shield, FileText, HeadphonesIcon, ChevronRight, Calendar, Hash } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  iconColor?: string;
  value?: string;
}

function MenuItem({ icon: Icon, label, onClick, iconColor = 'text-primary', value }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full py-3 px-1 hover:bg-accent/50 rounded-xl transition-colors"
    >
      <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="flex-1 text-sm font-medium text-foreground text-left">{label}</span>
      {value && <span className="text-xs text-muted-foreground">{value}</span>}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 flex flex-col">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">{title}</p>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user, wallet, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col gap-4 max-w-lg mx-auto">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto flex flex-col gap-4">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4"
        >
          {user?.photo_url ? (
            <img src={user.photo_url} alt={user.first_name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/30 shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
              {user?.first_name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-foreground truncate">{user?.first_name} {user?.last_name ?? ''}</h2>
            {user?.username && <p className="text-sm text-muted-foreground">@{user.username}</p>}
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Hash className="w-3 h-3" />{user?.telegram_id}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />{user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : ''}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Wallet */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Coins</span>
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums">{(wallet?.coins_balance ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">≈ ${((wallet?.coins_balance ?? 0) / 100).toFixed(2)}</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">USDT</span>
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums">${Number(wallet?.usdt_balance ?? 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Withdrawable</p>
          </div>
        </div>

        {/* Wallet Actions */}
        <MenuSection title="Wallet">
          <MenuItem icon={ArrowDownCircle} label="Deposit" iconColor="text-emerald-500" onClick={() => navigate('/deposit')} />
          <MenuItem icon={ArrowUpCircle} label="Withdraw" iconColor="text-blue-500" onClick={() => navigate('/withdraw')} />
          <MenuItem icon={History} label="Transaction History" iconColor="text-purple-500" onClick={() => navigate('/transactions')} />
        </MenuSection>

        {/* Settings */}
        <MenuSection title="Settings">
          <MenuItem icon={Palette} label="Theme" iconColor="text-pink-500" onClick={() => navigate('/settings')} />
          <MenuItem icon={Globe} label="Language" iconColor="text-blue-500" onClick={() => navigate('/settings')} />
          <MenuItem icon={Bell} label="Notifications" iconColor="text-orange-500" onClick={() => navigate('/settings')} />
        </MenuSection>

        {/* Info */}
        <MenuSection title="Information">
          <MenuItem icon={HelpCircle} label="FAQ" iconColor="text-primary" onClick={() => navigate('/faq')} />
          <MenuItem icon={Shield} label="Privacy Policy" iconColor="text-emerald-500" onClick={() => navigate('/privacy')} />
          <MenuItem icon={FileText} label="Terms & Conditions" iconColor="text-amber-500" onClick={() => navigate('/terms')} />
          <MenuItem icon={HeadphonesIcon} label="Support" iconColor="text-blue-500" onClick={() => navigate('/support')} />
        </MenuSection>

        <div className="text-center pb-4">
          <p className="text-xs text-muted-foreground">LUDZO V2 • Version 2.0.0</p>
        </div>
      </div>
    </div>
  );
}
