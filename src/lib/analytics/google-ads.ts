export const GOOGLE_ADS_TAG_ID = "AW-18518703197" as const;
const GOOGLE_ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim();

export type GoogleAdsEventName = "request_started" | "whatsapp_opened" | "request_confirmed";

type GoogleAdsEventParams = Readonly<{
  locale?: "ar" | "en";
}>;

type GoogleTag = (command: "config" | "event", target: string, params?: object) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GoogleTag;
  }
}

const TRACKING_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED === "true";
const CONSENT_GRANTED = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONSENT_GRANTED === "true";
const TESTING_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ADS_TESTING === "true";
const confirmedSubmissionIds = new Set<string>();

function isGoogleAdsTrackingAllowed(): boolean {
  if (!TRACKING_ENABLED || !CONSENT_GRANTED) return false;
  return process.env.NODE_ENV === "production" || TESTING_ENABLED;
}

function getDedupeStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function sendGoogleAdsEvent(
  eventName: GoogleAdsEventName,
  params: GoogleAdsEventParams = {},
): boolean {
  if (!isGoogleAdsTrackingAllowed() || typeof window === "undefined" || !window.gtag) {
    return false;
  }

  try {
    window.gtag("event", eventName, params);
    return true;
  } catch {
    return false;
  }
}

/**
 * Isolated future hook for the real Ads conversion action. It intentionally
 * does nothing until a genuine label is supplied by Google Ads configuration.
 */
export function trackRequestConfirmedConversion(locale: "ar" | "en"): void {
  if (!GOOGLE_ADS_CONVERSION_LABEL || !isGoogleAdsTrackingAllowed()) return;
  if (typeof window === "undefined" || !window.gtag) return;

  try {
    window.gtag("event", "conversion", {
      locale,
      send_to: `${GOOGLE_ADS_TAG_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`,
    });
  } catch {
    // Tracking must never affect request submission or navigation.
  }
}

export function trackRequestStarted(locale: "ar" | "en"): void {
  sendGoogleAdsEvent("request_started", { locale });
}

export function trackWhatsAppOpened(): void {
  sendGoogleAdsEvent("whatsapp_opened");
}

/**
 * The submission ID is used only as a local browser dedupe key. It is never
 * included in the event parameters sent to Google.
 */
export function trackRequestConfirmed(submissionId: string, locale: "ar" | "en"): void {
  if (!isGoogleAdsTrackingAllowed() || typeof window === "undefined") return;

  const storage = getDedupeStorage();
  const dedupeKey = `naqlk:google-ads:request-confirmed:${submissionId}`;

  try {
    if (confirmedSubmissionIds.has(submissionId) || storage?.getItem(dedupeKey) === "1") return;
    if (!sendGoogleAdsEvent("request_confirmed", { locale })) return;
    confirmedSubmissionIds.add(submissionId);
    storage?.setItem(dedupeKey, "1");
  } catch {
    // Tracking must never affect request submission or navigation.
  }
}
