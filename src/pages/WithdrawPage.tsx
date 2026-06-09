import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, AlertCircle, Loader2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createWithdrawal } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const NETWORKS = [
  { value: 'TRC20', label: 'USDT TRC20 (Tron)' },
  { value: 'ERC20', label: 'USDT ERC20 (Ethereum)' },
  { value: 'BEP20', label: 'USDT BEP20 (BSC)' },
];

export default function WithdrawPage() {
  const { user, wallet, refreshWallet } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('TRC20');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const fee = numAmount * 0.05;
  const finalAmount = numAmount - fee;
  const available = Number(wallet?.usdt_balance ?? 0);
  const isValid = numAmount >= 5 && numAmount <= available && address.trim().length > 10;

  const handleWithdraw = async () => {
    if (!user || !isValid) return;
    setLoading(true);
    try {
      const result = await createWithdrawal(user.id, numAmount, address.trim(), network);
      if (result.success) {
        toast.success('Withdrawal request submitted! Processing within 48 hours.', { icon: '✅' });
        await refreshWallet();
        navigate(-1);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Failed to submit withdrawal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Withdraw</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-5">
        {/* Available Balance */}
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Available USDT Balance</p>
            <p className="text-xl font-bold text-foreground tabular-nums">${available.toFixed(2)}</p>
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal text-foreground">Withdrawal Amount (USD)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              min="5"
              max={available}
              step="0.01"
              className="pl-9 h-12 text-lg"
            />
          </div>
          <div className="flex gap-1">
            <p className="text-xs text-muted-foreground flex-1">Minimum: $5.00</p>
            <button onClick={() => setAmount(String(available.toFixed(2)))} className="text-xs text-primary font-medium">Max</button>
          </div>
        </div>

        {/* Fee Breakdown */}
        {numAmount > 0 && (
          <div className="rounded-xl bg-muted/50 p-3 flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-foreground font-medium tabular-nums">${numAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Fee (5%)</span>
              <span className="text-destructive font-medium tabular-nums">-${fee.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between text-sm">
              <span className="font-semibold text-foreground">You Receive</span>
              <span className="font-bold text-success tabular-nums">${finalAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Network */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal text-foreground">Network</label>
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NETWORKS.map(n => (
                <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Wallet Address */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal text-foreground">Wallet Address</label>
          <Input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Enter your wallet address"
            className="h-12 font-mono text-sm"
          />
        </div>

        {/* Notice */}
        <div className="flex gap-2 p-3 rounded-xl bg-muted/50 border border-border">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Withdrawals are manually reviewed and processed within 48 hours. Coins cannot be withdrawn — only USDT.
          </p>
        </div>

        {numAmount > available && available > 0 && (
          <div className="flex gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">Insufficient balance.</p>
          </div>
        )}

        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={handleWithdraw}
          disabled={!isValid || loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isValid ? `Withdraw $${finalAmount.toFixed(2)} USDT` : 'Enter valid withdrawal details'}
        </Button>
      </div>
    </div>
  );
}
