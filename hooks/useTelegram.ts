"use client";

import { useEffect, useState } from "react";

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
    query_id?: string;
    hash?: string;
  };
  colorScheme: "dark" | "light";
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  expand: () => void;
  close: () => void;
  ready: () => void;
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function useTelegram() {
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string>("");
  const [startParam, setStartParam] = useState<string | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const [colorScheme, setColorScheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setInitData(tg.initData ?? "");
      setTgUser(tg.initDataUnsafe?.user ?? null);
      setStartParam(tg.initDataUnsafe?.start_param);
      setColorScheme(tg.colorScheme ?? "dark");
      setIsReady(true);
    } else if (process.env.NODE_ENV === "development") {
      // Dev mode mock user
      setTgUser({
        id: 123456789,
        first_name: "Dev",
        last_name: "User",
        username: "devuser",
        language_code: "en",
      });
      setInitData("dev_mode");
      setIsReady(true);
    } else {
      setIsReady(true);
    }
  }, []);

  const haptic = (type: "impact" | "success" | "error" | "warning" = "impact") => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    if (type === "impact") tg.HapticFeedback.impactOccurred("light");
    else tg.HapticFeedback.notificationOccurred(type as "success" | "error" | "warning");
  };

  return { tgUser, initData, startParam, isReady, colorScheme, haptic };
}
