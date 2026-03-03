import React from "react";
import "./globals.css";

import { Providers } from "./providers";
import Shell from "./shell";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";

// Fonts (Next.js way) – keeps fonts bundled and avoids relying on index.html (Vite)
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "Digitalize Labs",
  description: "Hệ thống số hóa hồ sơ pháp lý chuyên biệt có AI hỗ trợ.",
  keywords: "METS, ALTO XML, AES-256, Legal AI, Document Digitization",
  openGraph: {
    title: "Digitalize Labs",
    description: "Hệ thống số hóa hồ sơ pháp lý chuyên biệt có AI hỗ trợ.",
    siteName: "Digitalize Labs",
    locale: "vi_VN",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children?: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <Shell>{children}</Shell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
