"use client";

import Script from "next/script";
import { useEffect, useSyncExternalStore } from "react";

import { GOOGLE_ADS_TAG_ID } from "@/lib/analytics/google-ads";
import {
  getGoogleAdsConsentSnapshot,
  getServerGoogleAdsConsentSnapshot,
  initializeGoogleAdsConsent,
  subscribeToGoogleAdsConsent,
} from "@/lib/analytics/google-ads-consent";

const trackingEnabled = process.env.NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED === "true";
const testingEnabled = process.env.NEXT_PUBLIC_GOOGLE_ADS_TESTING === "true";
const allowedEnvironment = process.env.NODE_ENV === "production" || testingEnabled;

export function GoogleAdsTag() {
  const consent = useSyncExternalStore(
    subscribeToGoogleAdsConsent,
    getGoogleAdsConsentSnapshot,
    getServerGoogleAdsConsentSnapshot,
  );

  useEffect(() => initializeGoogleAdsConsent(), []);

  if (!trackingEnabled || !allowedEnvironment || consent !== "granted") return null;

  return (
    <>
      <Script
        id="naqlk-google-ads-tag"
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_TAG_ID}`}
        strategy="afterInteractive"
      />
      <Script id="naqlk-google-ads-config" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', {
  ad_storage: 'granted',
  analytics_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted'
});
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_TAG_ID}');`}
      </Script>
    </>
  );
}
