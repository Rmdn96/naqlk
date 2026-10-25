"use client";

import { useTranslations } from "next-intl";

import { openGoogleAdsConsentSettings } from "@/lib/analytics/google-ads-consent";

export function GoogleAdsConsentSettingsButton() {
  const t = useTranslations("GoogleAdsConsent");

  return (
    <button className="hover:underline" onClick={openGoogleAdsConsentSettings} type="button">
      {t("manage")}
    </button>
  );
}
