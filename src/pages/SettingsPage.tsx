import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Monitor, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ThemeMode } from '@/types/types';
import { LANGUAGES } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

const THEMES: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function SettingsPage() {
  const { preferences, updatePreferences } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { t, lang, changeLanguage } = useTranslation();

  const handleTheme = async (t: ThemeMode) => {
    setTheme(t);
    await updatePreferences({ theme: t });
  };

  const handleLanguage = async (l: Language) => {
    changeLanguage(l);
    await updatePreferences({ language: l });
    toast.success('Language updated!');
  };

  const handleNotifications = async (enabled: boolean) => {
    await updatePreferences({ notifications_enabled: enabled });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">{t('settings.title')}</h1>
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto flex flex-col gap-5">
        {/* Theme */}
        <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">Theme</h3>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => handleTheme(value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${active ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
                  {active && <Check className="w-3 h-3 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Language */}
        <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">Language</h3>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map(l => {
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => handleLanguage(l.code)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left ${active ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                >
                  <span className="text-base">{l.flag}</span>
                  <span className={`text-xs font-medium flex-1 truncate ${active ? 'text-primary' : 'text-foreground'}`}>{l.nativeName}</span>
                  {active && <Check className="w-3 h-3 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">Receive alerts for rewards and updates</p>
          </div>
          <Switch
            checked={preferences?.notifications_enabled ?? true}
            onCheckedChange={handleNotifications}
          />
        </div>

        {/* Version */}
        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground">LUDZO V2 • Version 2.0.0</p>
        </div>
      </div>
    </div>
  );
}
