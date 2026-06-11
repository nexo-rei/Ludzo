import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppProvider } from "@/hooks/useApp";

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
        
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
