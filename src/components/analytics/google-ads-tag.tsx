"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { GOOGLE_ADS_TAG_ID } from "@/lib/analytics/google-ads";
import {
  applyGoogleAdsConsentForRoute,
  getGoogleAdsConsentSnapshot,
  getServerGoogleAdsConsentSnapshot,
  initializeGoogleAdsConsent,
  subscribeToGoogleAdsConsent,
} from "@/lib/analytics/google-ads-consent";
import { isGoogleAdsPublicPathname } from "@/lib/analytics/google-ads-route";

const trackingEnabled = process.env.NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED === "true";
const testingEnabled = process.env.NEXT_PUBLIC_GOOGLE_ADS_TESTING === "true";
const allowedEnvironment = process.env.NODE_ENV === "production" || testingEnabled;

export function GoogleAdsTag() {
  const pathname = usePathname();
  const routeAllowed = isGoogleAdsPublicPathname(pathname);
  const consent = useSyncExternalStore(
    subscribeToGoogleAdsConsent,
    getGoogleAdsConsentSnapshot,
    getServerGoogleAdsConsentSnapshot,
  );

  useEffect(() => initializeGoogleAdsConsent(), []);
  useEffect(() => applyGoogleAdsConsentForRoute(routeAllowed), [routeAllowed]);

  if (!trackingEnabled || !allowedEnvironment || !routeAllowed || consent !== "granted") {
    return null;
  }

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
gtag('config', '${GOOGLE_ADS_TAG_ID}', {
  send_page_view: false,
  page_location: window.location.origin + ${JSON.stringify(pathname)},
  page_referrer: ''
});`}
      </Script>
    </>
  );
}
