import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { GoogleAdsTag } from "@/components/analytics/google-ads-tag";
import { PublicChrome } from "@/components/shared/public-chrome";
import { MobileRequestCta } from "@/components/shared/mobile-request-cta";
import { BRAND } from "@/config/brand";
import { getMetadataBase } from "@/config/site";
import { routing } from "@/i18n/routing";

import "@/styles/globals.css";

export const metadata: Metadata = {
  applicationName: BRAND.names.en,
  metadataBase: getMetadataBase(),
  robots: { follow: true, index: true },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <body>
        <GoogleAdsTag />
        <NextIntlClientProvider messages={messages}>
          <a
            className="fixed start-4 top-3 z-[100] -translate-y-24 rounded-md bg-primary px-4 py-3 font-bold text-primary-foreground transition focus:translate-y-0"
            href="#main-content"
          >
            {messages.Common && typeof messages.Common === "object"
              ? (messages.Common as { skipToContent?: string }).skipToContent
              : "Skip to content"}
          </a>
          <PublicChrome>
            <SiteHeader />
          </PublicChrome>
          {children}
          <PublicChrome>
            <SiteFooter />
            <MobileRequestCta
              label={
                messages.Common && typeof messages.Common === "object"
                  ? String(
                      (messages.Common as { startRequest?: string }).startRequest ??
                        "Start request",
                    )
                  : "Start request"
              }
            />
          </PublicChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
