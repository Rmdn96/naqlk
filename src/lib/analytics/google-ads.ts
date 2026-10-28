import { hasGrantedGoogleAdsConsent } from "@/lib/analytics/google-ads-consent";
import { getGoogleAdsPageContext } from "@/lib/analytics/google-ads-route";

export const GOOGLE_ADS_TAG_ID = "AW-18518703197" as const;
export const GOOGLE_ADS_WHATSAPP_CONVERSION_LABEL = "GRLaCKXv5KwdEN34s_5E" as const;
const GOOGLE_ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim();

export type GoogleAdsEventName = "request_started" | "whatsapp_opened" | "request_confirmed";

type GoogleAdsEventParams = Readonly<{
  locale?: "ar" | "en";
  page_location: string;
  page_referrer: "";
}>;

type GoogleTag = (command: "config" | "consent" | "event", target: string, params?: object) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GoogleTag;
  }
}

const TRACKING_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED === "true";
const TESTING_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ADS_TESTING === "true";
const confirmedEventSubmissionIds = new Set<string>();
const confirmedConversionSubmissionIds = new Set<string>();

function isGoogleAdsTrackingAllowed(): boolean {
  if (!TRACKING_ENABLED || !hasGrantedGoogleAdsConsent() || !getGoogleAdsPageContext()) {
    return false;
  }
  return process.env.NODE_ENV === "production" || TESTING_ENABLED;
}

function getDedupeStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function hasTrackedSubmission(storage: Storage | null, dedupeKey: string): boolean {
  try {
    return storage?.getItem(dedupeKey) === "1";
  } catch {
    return false;
  }
}

function persistTrackedSubmission(storage: Storage | null, dedupeKey: string): void {
  try {
    storage?.setItem(dedupeKey, "1");
  } catch {
    // In-memory dedupe still protects the current page when storage is unavailable.
  }
}

function sendGoogleAdsEvent(
  eventName: GoogleAdsEventName,
  params: Omit<GoogleAdsEventParams, "page_location" | "page_referrer"> = {},
): boolean {
  const pageContext = getGoogleAdsPageContext();
  if (
    !isGoogleAdsTrackingAllowed() ||
    !pageContext ||
    typeof window === "undefined" ||
    !window.gtag
  ) {
    return false;
  }

  try {
    window.gtag("event", eventName, { ...params, ...pageContext });
    return true;
  } catch {
    return false;
  }
}

export function trackRequestConfirmedConversion(locale: "ar" | "en"): boolean {
  const pageContext = getGoogleAdsPageContext();
  if (!GOOGLE_ADS_CONVERSION_LABEL || !isGoogleAdsTrackingAllowed() || !pageContext) return false;
  if (typeof window === "undefined" || !window.gtag) return false;

  try {
    window.gtag("event", "conversion", {
      locale,
      ...pageContext,
      send_to: `${GOOGLE_ADS_TAG_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`,
    });
    return true;
  } catch {
    // Tracking must never affect request submission or navigation.
    return false;
  }
}

export function trackRequestStarted(locale: "ar" | "en"): void {
  sendGoogleAdsEvent("request_started", { locale });
}

function trackWhatsAppOpenedConversion(): boolean {
  if (!isGoogleAdsTrackingAllowed() || typeof window === "undefined" || !window.gtag) return false;

  try {
    window.gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_TAG_ID}/${GOOGLE_ADS_WHATSAPP_CONVERSION_LABEL}`,
    });
    return true;
  } catch {
    // Tracking must never affect WhatsApp navigation.
    return false;
  }
}

export function trackWhatsAppOpened(): void {
  sendGoogleAdsEvent("whatsapp_opened");
  trackWhatsAppOpenedConversion();
}

/**
 * The submission ID is used only as a local browser dedupe key. It is never
 * included in the event parameters sent to Google.
 */
export function trackRequestConfirmed(submissionId: string, locale: "ar" | "en"): void {
  if (!isGoogleAdsTrackingAllowed() || typeof window === "undefined" || !window.gtag) return;

  const storage = getDedupeStorage();
  const dedupeKeyPrefix = `naqlk:google-ads:request-confirmed:${submissionId}`;
  const eventDedupeKey = `${dedupeKeyPrefix}:event`;
  const conversionDedupeKey = `${dedupeKeyPrefix}:conversion`;

  if (
    !confirmedEventSubmissionIds.has(submissionId) &&
    !hasTrackedSubmission(storage, eventDedupeKey)
  ) {
    confirmedEventSubmissionIds.add(submissionId);
    if (sendGoogleAdsEvent("request_confirmed", { locale })) {
      persistTrackedSubmission(storage, eventDedupeKey);
    } else {
      confirmedEventSubmissionIds.delete(submissionId);
    }
  }

  if (
    GOOGLE_ADS_CONVERSION_LABEL &&
    !confirmedConversionSubmissionIds.has(submissionId) &&
    !hasTrackedSubmission(storage, conversionDedupeKey)
  ) {
    confirmedConversionSubmissionIds.add(submissionId);
    if (trackRequestConfirmedConversion(locale)) {
      persistTrackedSubmission(storage, conversionDedupeKey);
    } else {
      confirmedConversionSubmissionIds.delete(submissionId);
    }
  }
}
