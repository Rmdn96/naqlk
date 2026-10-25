"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  getGoogleAdsConsentSnapshot,
  getServerGoogleAdsConsentSnapshot,
  GOOGLE_ADS_CONSENT_SETTINGS_EVENT,
  GOOGLE_ADS_CONSENT_STORAGE_KEY,
  initializeGoogleAdsConsent,
  setGoogleAdsConsent,
  subscribeToGoogleAdsConsent,
  syncGoogleAdsConsentFromStorage,
} from "@/lib/analytics/google-ads-consent";
import { isGoogleAdsConsentUiPathname } from "@/lib/analytics/google-ads-route";

export function GoogleAdsConsentManager() {
  const t = useTranslations("GoogleAdsConsent");
  const pathname = usePathname();
  const consent = useSyncExternalStore(
    subscribeToGoogleAdsConsent,
    getGoogleAdsConsentSnapshot,
    getServerGoogleAdsConsentSnapshot,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    initializeGoogleAdsConsent();

    const openSettings = () => {
      setStorageError(false);
      setSettingsOpen(true);
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key === GOOGLE_ADS_CONSENT_STORAGE_KEY || event.key === null) {
        syncGoogleAdsConsentFromStorage();
      }
    };

    window.addEventListener(GOOGLE_ADS_CONSENT_SETTINGS_EVENT, openSettings);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(GOOGLE_ADS_CONSENT_SETTINGS_EVENT, openSettings);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  if (
    !isGoogleAdsConsentUiPathname(pathname) ||
    consent === "pending" ||
    (consent !== "unset" && !settingsOpen)
  ) {
    return null;
  }

  const chooseConsent = (choice: "denied" | "granted") => {
    const persisted = setGoogleAdsConsent(choice);

    if (choice === "granted" && !persisted) {
      setStorageError(true);
      return;
    }

    setStorageError(false);
    setSettingsOpen(false);
  };

  return (
    <section
      aria-labelledby="google-ads-consent-title"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:p-6"
      role="dialog"
    >
      <h2 className="text-base font-black" id="google-ads-consent-title">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {t("description")}{" "}
        <Link className="font-semibold text-primary underline" href="/privacy">
          {t("privacy")}
        </Link>
      </p>
      {storageError ? (
        <p aria-live="polite" className="mt-3 text-sm font-semibold text-destructive">
          {t("storageError")}
        </p>
      ) : null}
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button onClick={() => chooseConsent("denied")} type="button" variant="outline">
          {t("reject")}
        </Button>
        <Button onClick={() => chooseConsent("granted")} type="button">
          {t("accept")}
        </Button>
      </div>
    </section>
  );
}
