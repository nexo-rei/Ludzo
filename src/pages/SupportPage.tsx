import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTelegram } from '@/hooks/useTelegram';

export default function SupportPage() {
  const navigate = useNavigate();
  const { openLink } = useTelegram();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold text-foreground">Support</h1>
        </div>
      </div>

      <div className="px-4 py-8 max-w-lg mx-auto flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
          <MessageCircle className="w-10 h-10 text-primary" />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Need Help?</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Our support team is available 24/7 via Telegram. Typical response time is under 1 hour.
          </p>
        </div>

        <div className="w-full rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Telegram Support Bot</p>
              <p className="text-xs text-muted-foreground">@LudzoSupportBot</p>
            </div>
          </div>
          <Button
            className="w-full gap-2"
            onClick={() => openLink('https://t.me/LudzoSupportBot')}
          >
            <ExternalLink className="w-4 h-4" />
            Open Support Chat
          </Button>
        </div>

        <div className="w-full rounded-2xl bg-muted/40 border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Common Issues</h3>
          <ul className="flex flex-col gap-2">
            {[
              'Ad not crediting coins',
              'Withdrawal not processed',
              'Deposit not received',
              'Task verification failed',
              'Account issue',
            ].map(item => (
              <li key={item} className="text-xs text-muted-foreground flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-muted-foreground shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
