import { useEffect, useCallback } from 'react';

export function useTelegram() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, [tg]);

  const hapticLight = useCallback(() => {
    tg?.HapticFeedback?.impactOccurred('light');
  }, [tg]);

  const hapticMedium = useCallback(() => {
    tg?.HapticFeedback?.impactOccurred('medium');
  }, [tg]);

  const hapticSuccess = useCallback(() => {
    tg?.HapticFeedback?.notificationOccurred('success');
  }, [tg]);

  const hapticError = useCallback(() => {
    tg?.HapticFeedback?.notificationOccurred('error');
  }, [tg]);

  const shareLink = useCallback((url: string, text?: string) => {
    if (tg?.shareURL) {
      tg.shareURL(url, text);
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }, [tg]);

  const openLink = useCallback((url: string) => {
    if (tg?.openTelegramLink && url.includes('t.me')) {
      tg.openTelegramLink(url);
    } else if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [tg]);

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    hapticLight,
    hapticMedium,
    hapticSuccess,
    hapticError,
    shareLink,
    openLink,
  };
}
