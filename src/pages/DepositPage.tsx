import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, CreditCard, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createDeposit } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function DepositPage() {
  const { wallet } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const numAmount = parseFloat(amount) || 0;
  const isValid = numAmount >= 5;
  const coinsPreview = Math.floor(numAmount * 100);

  const handleDeposit = async () => {
    if (!user || !isValid) return;
    setLoading(true);
    try {
      const { paymentUrl } = await createDeposit(user.id, numAmount);
      toast.success('Redirecting to Binance Pay...', { icon: '💰' });
      window.open(paymentUrl, '_blank');
    } catch {
      toast.error('Failed to create deposit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Deposit</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-5">
        {/* Balance */}
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current USDT Balance</p>
            <p className="text-xl font-bold text-foreground tabular-nums">${Number(wallet?.usdt_balance ?? 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Amount Input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal text-foreground">Deposit Amount (USD)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              min="5"
              step="0.01"
              className="pl-9 h-12 text-lg"
            />
          </div>
          <p className="text-xs text-muted-foreground">Minimum deposit: $5.00</p>
          {numAmount > 0 && (
            <p className="text-xs text-primary">You will receive: {coinsPreview.toLocaleString()} Coins (100 per $1)</p>
          )}
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2 flex-wrap">
          {QUICK_AMOUNTS.map(a => (
            <button
              key={a}
              onClick={() => setAmount(String(a))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${Number(amount) === a ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'}`}
            >
              ${a}
            </button>
          ))}
        </div>

        {/* Payment Method */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground mb-3">Payment Method</p>
          <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary bg-primary/5">
            <CreditCard className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Binance Pay</p>
              <p className="text-xs text-muted-foreground">Instant • Secure • No fees</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </div>

        {/* Warning */}
        <div className="flex gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20">
          <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            You will be redirected to Binance Pay to complete your payment. The deposit will be credited automatically after confirmation.
          </p>
        </div>

        {/* Submit */}
        <Button
          className="w-full h-12 text-base font-semibold gap-2"
          onClick={handleDeposit}
          disabled={!isValid || loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
          {isValid ? `Deposit $${numAmount.toFixed(2)} via Binance Pay` : 'Enter amount ($5 minimum)'}
        </Button>
      </div>
    </div>
  );
}
