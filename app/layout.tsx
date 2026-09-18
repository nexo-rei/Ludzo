import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./workspace.css";
import MotionPreferences from "@/components/layout/MotionPreferences";
import TelegramHardening from "@/components/layout/TelegramHardening";
import { AppProvider } from "@/hooks/useApp";
import { I18nProvider } from "@/hooks/useI18n";

export const metadata: Metadata = {
  title: "LUDZO – Earn • Play • Win",
  description: "The premium Telegram Mini App for earning rewards",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" />

        <Script
          src="//libtl.com/sdk.js"
          data-zone="11113056"
          data-sdk="show_11113056"
          strategy="afterInteractive"
        />

        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111715" />
      </head>
      <body>
        <TelegramHardening />
        <MotionPreferences>
          <I18nProvider>
            <AppProvider>{children}</AppProvider>
          </I18nProvider>
        </MotionPreferences>
      </body>
    </html>
  );
}
