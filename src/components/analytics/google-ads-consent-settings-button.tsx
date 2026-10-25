"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { openGoogleAdsConsentSettings } from "@/lib/analytics/google-ads-consent";
import { isGoogleAdsConsentUiPathname } from "@/lib/analytics/google-ads-route";

export function GoogleAdsConsentSettingsButton() {
  const t = useTranslations("GoogleAdsConsent");
  const pathname = usePathname();

  if (!isGoogleAdsConsentUiPathname(pathname)) return null;

  return (
    <button className="hover:underline" onClick={openGoogleAdsConsentSettings} type="button">
      {t("manage")}
    </button>
  );
}
