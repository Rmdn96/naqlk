const LOCALE_PREFIX = /^\/(ar|en)(?:\/|$)/;
const RESERVED_LOCALE_SEGMENTS = new Set([
  "account",
  "admin",
  "dashboard",
  "finance",
  "forgot-password",
  "login",
  "operations",
  "privacy",
  "quality",
  "quote",
  "request",
  "reset-password",
  "sales",
  "services",
  "settings",
  "signup",
  "staff",
  "track",
  "verify-email",
]);

/** Only marketing and new-request routes may use Google Ads measurement. */
export function isGoogleAdsPublicPathname(pathname: string): boolean {
  if (!LOCALE_PREFIX.test(pathname)) return false;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1) return true;
  if (segments.length === 2 && segments[1] === "request") return true;
  if (segments.length === 3 && segments[1] === "services" && segments[2]) return true;

  return segments.length === 2 && !RESERVED_LOCALE_SEGMENTS.has(segments[1]);
}

export function isGoogleAdsConsentUiPathname(pathname: string): boolean {
  return isGoogleAdsPublicPathname(pathname) || /^\/(ar|en)\/privacy\/?$/.test(pathname);
}

export function getGoogleAdsPageContext():
  Readonly<{ page_location: string; page_referrer: "" }> | undefined {
  if (typeof window === "undefined" || !isGoogleAdsPublicPathname(window.location.pathname)) {
    return undefined;
  }

  return {
    page_location: `${window.location.origin}${window.location.pathname}`,
    page_referrer: "",
  };
}
