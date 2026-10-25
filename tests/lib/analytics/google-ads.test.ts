import { describe, expect, it } from "vitest";

describe("Google Ads tracking infrastructure", () => {
  it("keeps the tag ID and event names centralized", async () => {
    const source = await import("@/lib/analytics/google-ads");

    expect(source.GOOGLE_ADS_TAG_ID).toBe("AW-18518703197");
    expect(source.trackRequestStarted).toBeTypeOf("function");
    expect(source.trackWhatsAppOpened).toBeTypeOf("function");
    expect(source.trackRequestConfirmed).toBeTypeOf("function");
    expect(source.trackRequestConfirmedConversion).toBeTypeOf("function");
  });
});
