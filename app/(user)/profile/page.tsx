'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { useI18n } from '@/hooks/useI18n';
import { Copy, Check, ExternalLink, ChevronRight, Palette, Globe, User, FileText, HelpCircle, Shield } from 'lucide-react';
import { Locale, locales, localeLabels } from '@/lib/i18n/config';

const avatars = [
  { id: 'male1', src: '/avatars/male1.svg', label: 'Male 1' },
  { id: 'male2', src: '/avatars/male2.svg', label: 'Male 2' },
  { id: 'male3', src: '/avatars/male3.svg', label: 'Male 3' },
  { id: 'female1', src: '/avatars/female1.svg', label: 'Female 1' },
  { id: 'female2', src: '/avatars/female2.svg', label: 'Female 2' },
  { id: 'female3', src: '/avatars/female3.svg', label: 'Female 3' },
];

export default function ProfilePage() {
  const { user, api } = useTelegram();
  const { t, locale, setLocale } = useI18n();
  const [copied, setCopied] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState({ totalReferrals: 0, totalCoins: 0, totalCash: 0 });
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals'>('transactions');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [txRes, wdRes, refRes] = await Promise.all([
        api('/api/transactions'),
        api('/api/withdrawals'),
        api('/api/referrals'),
      ]);
      setTransactions(txRes.transactions || []);
      setWithdrawals(wdRes.withdrawals || []);
      setReferralStats(refRes);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const selectAvatar = async (avatarId: string) => {
    try {
      await api('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarId }),
      });
      setShowAvatarModal(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const wallet = user?.wallets?.[0] || { coins: 0, inr_balance: 0, usdt_balance: 0 };
  const referralLink = `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'LudzoBot'}?start=${user?.telegram_id || ''}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('profile.title')}</h1>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-6 text-center"
      >
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full bg-purple-600/30 overflow-hidden mx-auto flex items-center justify-center border-2 border-purple-500/50">
            {user?.photo_url && !user?.avatar ? (
              <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-purple-300">{user?.display_name?.[0] || '?'}</span>
            )}
          </div>
          <button
            onClick={() => setShowAvatarModal(true)}
            className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center"
          >
            <User className="w-4 h-4 text-white" />
          </button>
        </div>
        <h2 className="text-lg font-bold text-white">{user?.display_name}</h2>
        <p className="text-xs text-gray-500 mt-1">{user?.rank || 'Newbie'}</p>
        <p className="text-xs text-gray-600 mt-1">{new Date(user?.created_at || '').toLocaleDateString()}</p>
      </motion.div>

      {/* Wallet */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">{t('profile.wallet')}</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-yellow-400">{wallet.coins || 0}</p>
            <p className="text-[10px] text-gray-500">Coins</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-400">₹{wallet.inr_balance || 0}</p>
            <p className="text-[10px] text-gray-500">INR</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-400">{wallet.usdt_balance || 0}</p>
            <p className="text-[10px] text-gray-500">USDT</p>
          </div>
        </div>
      </div>

      {/* Referral */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">{t('profile.referral')}</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-black/30 rounded-lg p-3">
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500">{t('profile.referralCode')}</p>
              <p className="text-sm font-mono text-white truncate">{user?.telegram_id}</p>
            </div>
            <button
              onClick={() => copyToClipboard(String(user?.telegram_id || ''), 'code')}
              className="shrink-0 ml-2 p-2 bg-gray-800 rounded-lg"
            >
              {copied === 'code' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
          <div className="flex items-center justify-between bg-black/30 rounded-lg p-3">
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500">{t('profile.referralLink')}</p>
              <p className="text-xs text-gray-400 truncate">{referralLink}</p>
            </div>
            <button
              onClick={() => copyToClipboard(referralLink, 'link')}
              className="shrink-0 ml-2 p-2 bg-gray-800 rounded-lg"
            >
              {copied === 'link' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-black/30 rounded-lg p-2">
              <p className="text-lg font-bold text-white">{referralStats.totalReferrals}</p>
              <p className="text-[10px] text-gray-500">{t('profile.totalReferrals')}</p>
            </div>
            <div className="bg-black/30 rounded-lg p-2">
              <p className="text-lg font-bold text-yellow-400">{referralStats.totalCoins}</p>
              <p className="text-[10px] text-gray-500">{t('profile.referralEarnings')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* History Tabs */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl overflow-hidden">
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-3 text-xs font-medium ${activeTab === 'transactions' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500'}`}
          >
            {t('profile.transactionHistory')}
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-1 py-3 text-xs font-medium ${activeTab === 'withdrawals' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500'}`}
          >
            {t('profile.withdrawalHistory')}
          </button>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          {activeTab === 'transactions' ? (
            transactions.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">{t('common.noData')}</p>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <p className="text-xs text-gray-300 capitalize">{tx.type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-gray-600">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className={`text-sm font-bold ${tx.currency === 'coins' ? 'text-yellow-400' : tx.currency === 'inr' ? 'text-green-400' : 'text-blue-400'}`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}{tx.amount} {tx.currency}
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : (
            withdrawals.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">{t('common.noData')}</p>
            ) : (
              <div className="space-y-2">
                {withdrawals.map(wd => (
                  <div key={wd.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <p className="text-xs text-gray-300">{wd.method.toUpperCase()}</p>
                      <p className="text-[10px] text-gray-600">{new Date(wd.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{wd.amount} {wd.currency}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        wd.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        wd.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {wd.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">{t('profile.settings')}</h3>
        <button onClick={() => setShowThemeModal(true)} className="w-full flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
          <div className="flex items-center gap-3">
            <Palette className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">{t('profile.theme')}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
        <button onClick={() => setShowLangModal(true)} className="w-full flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">{t('profile.language')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{localeLabels[locale as Locale]}</span>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </div>
        </button>
      </div>

      {/* Links */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4 space-y-2">
        <button className="w-full flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">{t('profile.faq')}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
        <button className="w-full flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">{t('profile.privacyPolicy')}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
        <button className="w-full flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">{t('profile.termsConditions')}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Support */}
      <a
        href="https://t.me/LudzosupportBot"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 py-3 rounded-xl text-sm font-medium"
      >
        <ExternalLink className="w-4 h-4" />
        {t('profile.openSupport')}
      </a>

      {/* Modals */}
      <AnimatePresence>
        {showAvatarModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAvatarModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-700"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-4">{t('profile.selectAvatar')}</h3>
              <div className="grid grid-cols-3 gap-3">
                {avatars.map(avatar => (
                  <button
                    key={avatar.id}
                    onClick={() => selectAvatar(avatar.id)}
                    className="w-full aspect-square bg-gray-800 rounded-xl flex items-center justify-center hover:bg-purple-600/30 transition-colors"
                  >
                    <span className="text-2xl">
                      {avatar.id.includes('male') ? '♂️' : '♀️'}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLangModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowLangModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-700"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-4">{t('profile.language')}</h3>
              <div className="space-y-2">
                {locales.map(loc => (
                  <button
                    key={loc}
                    onClick={() => { setLocale(loc as Locale); setShowLangModal(false); }}
                    className={`w-full text-left p-3 rounded-xl transition-colors ${
                      locale === loc ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {localeLabels[loc as Locale]}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showThemeModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowThemeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-700"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-4">{t('profile.theme')}</h3>
              <div className="space-y-2">
                <button onClick={() => setShowThemeModal(false)} className="w-full text-left p-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700">
                  {t('profile.dark')}
                </button>
                <button onClick={() => setShowThemeModal(false)} className="w-full text-left p-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700">
                  {t('profile.light')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
