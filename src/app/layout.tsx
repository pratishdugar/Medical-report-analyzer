import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/components/i18n-provider";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SehatLens — Medical report analyzer", template: "%s · SehatLens" },
  description:
    "Upload lab reports, see trends and comparisons, and get plain-language suggestions in English or Hindi. Private by design.",
  applicationName: "SehatLens",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, messages } = await getI18n();
  return (
    <html lang={locale}>
      <body className="min-h-dvh antialiased">
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
