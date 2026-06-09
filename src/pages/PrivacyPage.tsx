import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold text-foreground">Privacy Policy</h1>
        </div>
      </div>
      <div className="px-4 py-5 max-w-lg mx-auto prose prose-sm dark:prose-invert max-w-none">
        <div className="flex flex-col gap-4 text-sm text-muted-foreground leading-relaxed">
          <p className="text-xs text-muted-foreground">Last updated: June 2025</p>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Telegram Data</h2>
            <p>Ludzo only collects data provided by Telegram when you open the Mini App: Telegram ID, first name, last name, username, profile photo URL, and language code. We do not collect email addresses, phone numbers, or passwords.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">How We Use Your Data</h2>
            <p>Your Telegram data is used to create and manage your account, display your profile, and personalize your experience. Wallet balances and transaction history are stored securely in our database.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Analytics</h2>
            <p>We may collect anonymous usage data to improve the platform, including ad views, task completions, and feature usage. This data is not linked to personally identifiable information.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Security</h2>
            <p>All data is transmitted over HTTPS. Sensitive financial operations (deposits, withdrawals) are processed through secure third-party providers (Binance Pay). We do not store payment card information.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">User Rights</h2>
            <p>You have the right to request deletion of your account and associated data by contacting support. Note that transaction records may be retained for legal compliance purposes.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Contact</h2>
            <p>For privacy concerns, contact us via @LudzoSupportBot on Telegram.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
