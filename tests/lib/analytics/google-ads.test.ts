import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type GoogleAdsModule = typeof import("@/lib/analytics/google-ads");

const SAFE_PAGE_CONTEXT = {
  page_location: "http://localhost:3000/en/request",
  page_referrer: "",
} as const;

async function loadGoogleAds({
  consentGranted = true,
  conversionLabel = "625xCKaL_58dEN34s_5E",
  trackingEnabled = "true",
}: {
  consentGranted?: boolean;
  conversionLabel?: string;
  trackingEnabled?: string;
} = {}): Promise<GoogleAdsModule> {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL", conversionLabel);
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS_TESTING", "true");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED", trackingEnabled);
  window.localStorage.setItem("naqlk:google-ads:consent:v1", consentGranted ? "granted" : "denied");

  const consent = await import("@/lib/analytics/google-ads-consent");
  consent.initializeGoogleAdsConsent();

  return import("@/lib/analytics/google-ads");
}

beforeEach(() => {
  window.history.replaceState({}, "", "/en/request?reference=fake-sensitive-reference");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  window.localStorage.clear();
  window.sessionStorage.clear();
  delete window.gtag;
});

describe("Google Ads tracking infrastructure", () => {
  it("keeps the tag ID and event names centralized", async () => {
    const source = await loadGoogleAds();

    expect(source.GOOGLE_ADS_TAG_ID).toBe("AW-18518703197");
    expect(source.GOOGLE_ADS_WHATSAPP_CONVERSION_LABEL).toBe("GRLaCKXv5KwdEN34s_5E");
    expect(source.trackRequestStarted).toBeTypeOf("function");
    expect(source.trackWhatsAppOpened).toBeTypeOf("function");
    expect(source.trackRequestConfirmed).toBeTypeOf("function");
    expect(source.trackRequestConfirmedConversion).toBeTypeOf("function");
  });

  it("emits the confirmation and conversion after a genuine completion without personal data", async () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    const { trackRequestConfirmed } = await loadGoogleAds();

    trackRequestConfirmed("submission-1", "ar");

    expect(gtag.mock.calls).toEqual([
      ["event", "request_confirmed", { locale: "ar", ...SAFE_PAGE_CONTEXT }],
      [
        "event",
        "conversion",
        {
          locale: "ar",
          ...SAFE_PAGE_CONTEXT,
          send_to: "AW-18518703197/625xCKaL_58dEN34s_5E",
        },
      ],
    ]);
    expect(JSON.stringify(gtag.mock.calls)).not.toContain("fake-sensitive-reference");
  });

  it("deduplicates both events for the same submission ID", async () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    const source = await loadGoogleAds();

    source.trackRequestConfirmed("submission-2", "en");
    source.trackRequestConfirmed("submission-2", "en");

    expect(gtag).toHaveBeenCalledTimes(2);
  });

  it("preserves session dedupe across module reloads", async () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    const firstLoad = await loadGoogleAds();
    firstLoad.trackRequestConfirmed("submission-3", "en");

    const secondLoad = await loadGoogleAds();
    secondLoad.trackRequestConfirmed("submission-3", "en");

    expect(gtag).toHaveBeenCalledTimes(2);
  });

  it("still sends the confirmation event when the conversion label is absent", async () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    const { trackRequestConfirmed } = await loadGoogleAds({ conversionLabel: "" });

    trackRequestConfirmed("submission-4", "ar");

    expect(gtag).toHaveBeenCalledOnce();
    expect(gtag).toHaveBeenCalledWith("event", "request_confirmed", {
      locale: "ar",
      ...SAFE_PAGE_CONTEXT,
    });
  });

  it("sends exactly one WhatsApp conversion alongside the custom event", async () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    const { trackRequestStarted, trackWhatsAppOpened } = await loadGoogleAds();

    trackRequestStarted("en");
    trackWhatsAppOpened();

    expect(gtag.mock.calls).toEqual([
      ["event", "request_started", { locale: "en", ...SAFE_PAGE_CONTEXT }],
      ["event", "whatsapp_opened", SAFE_PAGE_CONTEXT],
      ["event", "conversion", { send_to: "AW-18518703197/GRLaCKXv5KwdEN34s_5E" }],
    ]);
    expect(
      gtag.mock.calls.filter(
        ([command, eventName]) => command === "event" && eventName === "conversion",
      ),
    ).toHaveLength(1);
  });

  it.each([
    "/en/quote/fake-quote-token?reference=fake-reference",
    "/ar/track/fake-tracking-token?phone=fake-phone",
    "/en/account",
    "/ar/login",
    "/en/request/success?reference=fake-reference",
  ])("blocks events on a direct sensitive route: %s", async (pathname) => {
    window.history.replaceState({}, "", pathname);
    const gtag = vi.fn();
    window.gtag = gtag;
    const { trackRequestConfirmed, trackRequestStarted, trackWhatsAppOpened } =
      await loadGoogleAds();

    trackRequestStarted("en");
    trackWhatsAppOpened();
    trackRequestConfirmed("fake-submission-token", "en");

    expect(gtag).not.toHaveBeenCalled();
  });

  it("does nothing when gtag is absent", async () => {
    const { trackRequestConfirmed, trackWhatsAppOpened } = await loadGoogleAds();

    expect(() => trackRequestConfirmed("submission-5", "ar")).not.toThrow();
    expect(() => trackWhatsAppOpened()).not.toThrow();
    expect(
      window.sessionStorage.getItem("naqlk:google-ads:request-confirmed:submission-5"),
    ).toBeNull();
  });

  it.each([
    { consentGranted: true, name: "tracking is disabled", trackingEnabled: "false" },
    { consentGranted: false, name: "consent is absent", trackingEnabled: "true" },
  ])("does nothing when $name", async ({ consentGranted, trackingEnabled }) => {
    const gtag = vi.fn();
    window.gtag = gtag;
    const { trackRequestConfirmed, trackWhatsAppOpened } = await loadGoogleAds({
      consentGranted,
      trackingEnabled,
    });

    trackRequestConfirmed("submission-6", "en");
    trackWhatsAppOpened();

    expect(gtag).not.toHaveBeenCalled();
  });

  it("keeps tracking and in-page dedupe working when sessionStorage fails", async () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    const { trackRequestConfirmed } = await loadGoogleAds();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(() => trackRequestConfirmed("submission-7", "ar")).not.toThrow();
    expect(() => trackRequestConfirmed("submission-7", "ar")).not.toThrow();
    expect(gtag).toHaveBeenCalledTimes(2);
  });

  it("still sends the conversion and retries only the confirmation event when that call fails", async () => {
    const gtag = vi.fn().mockImplementationOnce(() => {
      throw new Error("request event failed");
    });
    window.gtag = gtag;
    const { trackRequestConfirmed } = await loadGoogleAds();

    expect(() => trackRequestConfirmed("submission-8", "ar")).not.toThrow();
    trackRequestConfirmed("submission-8", "ar");

    expect(gtag.mock.calls).toEqual([
      ["event", "request_confirmed", { locale: "ar", ...SAFE_PAGE_CONTEXT }],
      [
        "event",
        "conversion",
        {
          locale: "ar",
          ...SAFE_PAGE_CONTEXT,
          send_to: "AW-18518703197/625xCKaL_58dEN34s_5E",
        },
      ],
      ["event", "request_confirmed", { locale: "ar", ...SAFE_PAGE_CONTEXT }],
    ]);
  });

  it("retries only the conversion when its gtag call fails", async () => {
    let conversionAttempts = 0;
    const gtag = vi.fn((command, target) => {
      if (command === "event" && target === "conversion" && conversionAttempts++ === 0) {
        throw new Error("conversion failed");
      }
    });
    window.gtag = gtag;
    const { trackRequestConfirmed } = await loadGoogleAds();

    expect(() => trackRequestConfirmed("submission-9", "en")).not.toThrow();
    trackRequestConfirmed("submission-9", "en");

    expect(gtag.mock.calls).toEqual([
      ["event", "request_confirmed", { locale: "en", ...SAFE_PAGE_CONTEXT }],
      [
        "event",
        "conversion",
        {
          locale: "en",
          ...SAFE_PAGE_CONTEXT,
          send_to: "AW-18518703197/625xCKaL_58dEN34s_5E",
        },
      ],
      [
        "event",
        "conversion",
        {
          locale: "en",
          ...SAFE_PAGE_CONTEXT,
          send_to: "AW-18518703197/625xCKaL_58dEN34s_5E",
        },
      ],
    ]);
  });
});
