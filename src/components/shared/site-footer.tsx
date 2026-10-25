import { getTranslations } from "next-intl/server";

import { GoogleAdsConsentSettingsButton } from "@/components/analytics/google-ads-consent-settings-button";
import { Brand } from "@/components/shared/brand";
import { ContactNumberPicker } from "@/components/shared/contact-number-picker";
import { getLocale } from "next-intl/server";
import { getPublicBusinessConfiguration } from "@/lib/business-settings/public-settings";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const [t, locale, business] = await Promise.all([
    getTranslations("Common"),
    getLocale() as Promise<AppLocale>,
    getPublicBusinessConfiguration(),
  ]);
  const address = business.address[locale];

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.8fr]">
        <div className="[&_a]:text-primary-foreground [&_span]:text-primary-foreground/75">
          <Brand />
          <p className="mt-5 max-w-xl text-sm leading-7 text-primary-foreground/75">
            {t("footerText")}
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm text-primary-foreground/75">
          <strong className="text-primary-foreground">{t("services")}</strong>
          <Link className="hover:underline" href="/services/furniture-moving">
            {t("serviceFurniture")}
          </Link>
          <Link className="hover:underline" href="/services/goods-transport">
            {t("serviceCargo")}
          </Link>
          <Link className="hover:underline" href="/services/within-city-transport">
            {t("serviceLocal")}
          </Link>
          <Link className="hover:underline" href="/services/intercity-transport">
            {t("serviceIntercity")}
          </Link>
        </div>
        <div className="flex flex-col gap-3 text-sm font-semibold">
          <strong>{t("quickLinks")}</strong>
          <Link className="hover:underline" href="/request">
            {t("startRequest")}
          </Link>
          <Link className="hover:underline" href="/privacy">
            {t("privacy")}
          </Link>
          <GoogleAdsConsentSettingsButton />
          <Link className="hover:underline" href="/track">
            {t("trackRequest")}
          </Link>
        </div>
        <div className="space-y-3 text-sm text-primary-foreground/75">
          <strong className="block text-primary-foreground">{t("contact")}</strong>
          <ContactNumberPicker
            allowCall
            ariaLabel={t("whatsapp")}
            className="inline-flex rounded-md bg-primary-foreground/10 px-3 py-2 text-primary-foreground transition hover:bg-primary-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            message={
              locale === "ar"
                ? "مرحباً نقلك، أود الاستفسار عن خدمات النقل."
                : "Hello Naqlk, I would like to ask about your transport services."
            }
          >
            {t("whatsapp")}
          </ContactNumberPicker>
          {business.email ? (
            <a className="block hover:underline" href={`mailto:${business.email}`}>
              {business.email}
            </a>
          ) : null}
          {address ? <p>{address}</p> : null}
          {business.workingHours[locale] ? <p>{business.workingHours[locale]}</p> : null}
          <div className="flex flex-wrap gap-4">
            {business.social.instagram ? (
              <a
                className="hover:underline"
                href={business.social.instagram}
                rel="noreferrer"
                target="_blank"
              >
                Instagram
              </a>
            ) : null}
            {business.social.x ? (
              <a
                className="hover:underline"
                href={business.social.x}
                rel="noreferrer"
                target="_blank"
              >
                X
              </a>
            ) : null}
            {business.social.tiktok ? (
              <a
                className="hover:underline"
                href={business.social.tiktok}
                rel="noreferrer"
                target="_blank"
              >
                TikTok
              </a>
            ) : null}
          </div>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="container py-4 text-xs text-primary-foreground/65">
          © {new Date().getFullYear()} {t("copyright")}
        </div>
      </div>
    </footer>
  );
}
