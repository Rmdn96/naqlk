import { afterEach, describe, expect, it, vi } from "vitest";

type GoogleAdsModule = typeof import("@/lib/analytics/google-ads");

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
      ["event", "request_confirmed", { locale: "ar" }],
      ["event", "conversion", { locale: "ar", send_to: "AW-18518703197/625xCKaL_58dEN34s_5E" }],
    ]);
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
    expect(gtag).toHaveBeenCalledWith("event", "request_confirmed", { locale: "ar" });
  });

  it("never sends a conversion for request start or WhatsApp events", async () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    const { trackRequestStarted, trackWhatsAppOpened } = await loadGoogleAds();

    trackRequestStarted("en");
    trackWhatsAppOpened();

    expect(gtag.mock.calls).toEqual([
      ["event", "request_started", { locale: "en" }],
      ["event", "whatsapp_opened", {}],
    ]);
  });

  it("does nothing when gtag is absent", async () => {
    const { trackRequestConfirmed } = await loadGoogleAds();

    expect(() => trackRequestConfirmed("submission-5", "ar")).not.toThrow();
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
    const { trackRequestConfirmed } = await loadGoogleAds({ consentGranted, trackingEnabled });

    trackRequestConfirmed("submission-6", "en");

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
      ["event", "request_confirmed", { locale: "ar" }],
      ["event", "conversion", { locale: "ar", send_to: "AW-18518703197/625xCKaL_58dEN34s_5E" }],
      ["event", "request_confirmed", { locale: "ar" }],
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
      ["event", "request_confirmed", { locale: "en" }],
      ["event", "conversion", { locale: "en", send_to: "AW-18518703197/625xCKaL_58dEN34s_5E" }],
      ["event", "conversion", { locale: "en", send_to: "AW-18518703197/625xCKaL_58dEN34s_5E" }],
    ]);
  });
});
