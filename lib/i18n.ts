// Keep this list as the single source of truth for onboarding, settings and
// server-side preference validation. The names are intentionally native so a
// person can recognise a language before changing the app language.
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English",    nativeName: "English",    country: "United States", countryCode: "US" },
  { code: "ru", name: "Russian",    nativeName: "Русский",    country: "Russia",        countryCode: "RU" },
  { code: "uk", name: "Ukrainian",  nativeName: "Українська", country: "Ukraine",      countryCode: "UA" },
  { code: "es", name: "Spanish",    nativeName: "Español",    country: "Spain",        countryCode: "ES" },
  { code: "pt", name: "Portuguese", nativeName: "Português",  country: "Portugal",     countryCode: "PT" },
  { code: "fr", name: "French",     nativeName: "Français",   country: "France",       countryCode: "FR" },
  { code: "de", name: "German",     nativeName: "Deutsch",    country: "Germany",      countryCode: "DE" },
  { code: "it", name: "Italian",    nativeName: "Italiano",   country: "Italy",        countryCode: "IT" },
  { code: "tr", name: "Turkish",    nativeName: "Türkçe",     country: "Türkiye",      countryCode: "TR" },
  { code: "hi", name: "Hindi",      nativeName: "हिन्दी",      country: "India",        countryCode: "IN" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export function isSupportedLanguage(value: unknown): value is LanguageCode {
  return typeof value === "string" && SUPPORTED_LANGUAGES.some((language) => language.code === value);
}

export function normalizeLanguage(value: unknown): LanguageCode {
  const code = typeof value === "string" ? value.toLowerCase().split("-")[0] : "";
  return isSupportedLanguage(code) ? code : "en";
}

const EN: Record<string, string> = {
  // Nav
  home: "Home", tasks: "Tasks", games: "Games", refer: "Refer", profile: "Profile",
  // Common
  loading: "Loading...", error: "Something went wrong", retry: "Retry",
  cancel: "Cancel", save: "Save", confirm: "Confirm", close: "Close",
  submit: "Submit", back: "Back", next: "Next", done: "Done",
  copy: "Copy", share: "Share", copied: "Copied!",
  // Auth
  sign_in: "Sign In with Telegram", dev_mode: "Continue (Dev Mode)",
  welcome: "Welcome to LUDZO", tagline: "EARN • PLAY • WIN",
  // Home
  coin_balance: "Coin Balance", usdt_balance: "USDT Balance",
  watch_ad: "Watch Ad", ads_today: "Ads Today",
  daily_limit_reached: "Daily limit reached. Come back tomorrow.",
  daily_streak: "Daily Streak", claim_streak: "Claim Reward",
  bonus_ads_needed: "Watch {n} more bonus ad(s) to claim",
  streak_claimed: "Streak claimed! +{n} Coins",
  recent_activity: "Recent Activity", view_all: "View All",
  leaderboard_preview: "Top Earners",
  announcements: "Announcements",
  deposit: "Deposit", withdraw: "Withdraw",
  // Tasks
  available_tasks: "Available Tasks", completed_tasks: "Completed Tasks",
  task_completed: "Task completed! +{n} Coins",
  task_already_done: "Already completed",
  verify_task: "Verify", start_task: "Start",
  // Games
  coming_soon: "Coming Soon", notify_me: "Notify Me",
  // Refer
  your_referral_link: "Your Referral Link",
  referral_stats: "Referral Stats",
  total_referrals: "Total Referrals",
  total_commission: "Total Commission",
  how_it_works: "How It Works",
  referral_history: "Referral History",
  // Profile
  settings: "Settings", history: "Transaction History",
  leaderboard: "Leaderboard", faq: "FAQ",
  privacy: "Privacy Policy", terms: "Terms of Service",
  support: "Support", logout: "Logout",
  // Settings
  appearance: "Appearance", language_setting: "Language",
  notifications: "Notifications",
  // Leaderboard
  rank: "Rank", earned: "Earned",
  // Deposit / Withdraw
  min_deposit: "Minimum deposit: $5",
  min_withdraw: "Minimum withdrawal: $5",
  fee_note: "5% withdrawal fee applies",
  review_note: "Withdrawals are manually reviewed within 48 hours",
  // Empty states
  no_tasks: "No tasks available", no_history: "No transactions yet",
  no_referrals: "No referrals yet", no_announcements: "No announcements",
  no_deposits: "No deposits yet", no_withdrawals: "No withdrawals yet",
};

export const translations: Partial<Record<LanguageCode, Record<string, string>>> = {
  en: EN,
  ru: { ...EN,
    home: "Главная", tasks: "Задания", games: "Игры", refer: "Рефералы", profile: "Профиль",
    loading: "Загрузка...", watch_ad: "Смотреть рекламу", daily_streak: "Ежедневная серия",
    claim_streak: "Получить награду", deposit: "Пополнить", withdraw: "Вывести",
    tagline: "ЗАРАБАТЫВАЙ • ИГРАЙ • ПОБЕЖДАЙ",
  },
  uk: { ...EN,
    home: "Головна", tasks: "Завдання", games: "Ігри", refer: "Реферали", profile: "Профіль",
    loading: "Завантаження...", watch_ad: "Дивитися рекламу",
    tagline: "ЗАРОБЛЯЙ • ГРАЙ • ПЕРЕМАГАЙ",
  },
  es: { ...EN,
    home: "Inicio", tasks: "Tareas", games: "Juegos", refer: "Referir", profile: "Perfil",
    loading: "Cargando...", watch_ad: "Ver anuncio", daily_streak: "Racha diaria",
    tagline: "GANA • JUEGA • TRIUNFA",
  },
  pt: { ...EN,
    home: "Início", tasks: "Tarefas", games: "Jogos", refer: "Indicar", profile: "Perfil",
    loading: "Carregando...", watch_ad: "Ver anúncio",
    tagline: "GANHE • JOGUE • VENÇA",
  },
  fr: { ...EN,
    home: "Accueil", tasks: "Tâches", games: "Jeux", refer: "Parrainer", profile: "Profil",
    loading: "Chargement...", watch_ad: "Voir une pub",
    tagline: "GAGNEZ • JOUEZ • GAGNEZ",
  },
  de: { ...EN,
    home: "Start", tasks: "Aufgaben", games: "Spiele", refer: "Empfehlen", profile: "Profil",
    loading: "Laden...", watch_ad: "Werbung ansehen",
    tagline: "VERDIENE • SPIELE • GEWINNE",
  },
  it: { ...EN,
    home: "Home", tasks: "Compiti", games: "Giochi", refer: "Riferire", profile: "Profilo",
    loading: "Caricamento...", watch_ad: "Guarda annuncio",
    tagline: "GUADAGNA • GIOCA • VINCI",
  },
  tr: { ...EN,
    home: "Ana Sayfa", tasks: "Görevler", games: "Oyunlar", refer: "Davet Et", profile: "Profil",
    loading: "Yükleniyor...", watch_ad: "Reklam İzle",
    tagline: "KAZAN • OYNA • KAZAN",
  },
  hi: { ...EN,
    home: "होम", tasks: "कार्य", games: "खेल", refer: "रेफर", profile: "प्रोफ़ाइल",
    loading: "लोड हो रहा है...", watch_ad: "विज्ञापन देखें",
    tagline: "कमाएं • खेलें • जीतें",
  },
};

export function getTranslation(lang: string, key: string, vars?: Record<string, string | number>): string {
  const code = normalizeLanguage(lang);
  let text = translations[code]?.[key] ?? translations.en?.[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
