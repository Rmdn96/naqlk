import Script from "next/script";

import { GOOGLE_ADS_TAG_ID } from "@/lib/analytics/google-ads";

const trackingEnabled = process.env.NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED === "true";
const consentGranted = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONSENT_GRANTED === "true";
const testingEnabled = process.env.NEXT_PUBLIC_GOOGLE_ADS_TESTING === "true";
const allowedEnvironment = process.env.NODE_ENV === "production" || testingEnabled;

export function GoogleAdsTag() {
  if (!trackingEnabled || !consentGranted || !allowedEnvironment) return null;

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
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_TAG_ID}');`}
      </Script>
    </>
  );
}
