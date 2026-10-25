export const GOOGLE_ADS_CONSENT_STORAGE_KEY = "naqlk:google-ads:consent:v1" as const;
export const GOOGLE_ADS_CONSENT_SETTINGS_EVENT = "naqlk:google-ads:consent-settings" as const;

export type GoogleAdsConsentChoice = "denied" | "granted";
export type GoogleAdsConsentSnapshot = "denied" | "granted" | "pending" | "unset";

const listeners = new Set<() => void>();
let consentSnapshot: GoogleAdsConsentSnapshot = "pending";

function emitConsentChange(): void {
  listeners.forEach((listener) => listener());
}

function replaceConsentSnapshot(nextSnapshot: GoogleAdsConsentSnapshot): void {
  if (consentSnapshot === nextSnapshot) return;
  consentSnapshot = nextSnapshot;
  emitConsentChange();
}

function readStoredConsent(): Exclude<GoogleAdsConsentSnapshot, "pending"> {
  if (typeof window === "undefined") return "unset";

  try {
    const stored = window.localStorage.getItem(GOOGLE_ADS_CONSENT_STORAGE_KEY);
    return stored === "granted" || stored === "denied" ? stored : "unset";
  } catch {
    return "unset";
  }
}

function updateLoadedGoogleTagConsent(choice: GoogleAdsConsentChoice): void {
  if (typeof window === "undefined" || !window.gtag) return;

  try {
    window.gtag("consent", "update", {
      ad_personalization: choice,
      ad_storage: choice,
      ad_user_data: choice,
      analytics_storage: choice,
    });
  } catch {
    // Consent handling must never interfere with the page.
  }
}

export function subscribeToGoogleAdsConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGoogleAdsConsentSnapshot(): GoogleAdsConsentSnapshot {
  return consentSnapshot;
}

export function getServerGoogleAdsConsentSnapshot(): GoogleAdsConsentSnapshot {
  return "pending";
}

export function initializeGoogleAdsConsent(): void {
  replaceConsentSnapshot(readStoredConsent());
}

export function syncGoogleAdsConsentFromStorage(): void {
  const storedConsent = readStoredConsent();
  replaceConsentSnapshot(storedConsent);
  updateLoadedGoogleTagConsent(storedConsent === "granted" ? "granted" : "denied");
}

export function hasGrantedGoogleAdsConsent(): boolean {
  return consentSnapshot === "granted";
}

export function setGoogleAdsConsent(choice: GoogleAdsConsentChoice): boolean {
  if (typeof window === "undefined") return false;

  let persisted = false;

  try {
    window.localStorage.setItem(GOOGLE_ADS_CONSENT_STORAGE_KEY, choice);
    persisted = true;
  } catch {
    // Granting fails closed; denying remains effective for the current page.
  }

  const effectiveChoice = choice === "granted" && !persisted ? "unset" : choice;
  replaceConsentSnapshot(effectiveChoice);
  updateLoadedGoogleTagConsent(effectiveChoice === "granted" ? "granted" : "denied");

  return persisted;
}

export function openGoogleAdsConsentSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GOOGLE_ADS_CONSENT_SETTINGS_EVENT));
}
