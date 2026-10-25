import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

vi.mock("next/script", () => ({
  default: ({ children, id, src }: { children?: React.ReactNode; id: string; src?: string }) => (
    <div data-src={src} data-testid={id} id={id}>
      {children}
    </div>
  ),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
    function MockLink({ children, href, ...props }, ref) {
      return (
        <a href={String(href)} ref={ref} {...props}>
          {children}
        </a>
      );
    },
  ),
}));

const CONSENT_KEY = "naqlk:google-ads:consent:v1";

async function renderConsent(locale: "ar" | "en" = "en") {
  vi.resetModules();
  const [{ GoogleAdsConsentManager }, { GoogleAdsConsentSettingsButton }, { GoogleAdsTag }] =
    await Promise.all([
      import("@/components/analytics/google-ads-consent-manager"),
      import("@/components/analytics/google-ads-consent-settings-button"),
      import("@/components/analytics/google-ads-tag"),
    ]);

  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "ar" ? ar : en}>
      <GoogleAdsTag />
      <GoogleAdsConsentSettingsButton />
      <GoogleAdsConsentManager />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS_TESTING", "true");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED", "true");
  window.localStorage.clear();
  delete window.gtag;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  window.localStorage.clear();
  delete window.gtag;
});

describe("Google Ads runtime consent", () => {
  it("defaults to denied and loads the Google tag only after acceptance", async () => {
    await renderConsent();

    expect(await screen.findByRole("dialog", { name: "Advertising privacy choices" })).toBeTruthy();
    expect(screen.queryByTestId("naqlk-google-ads-tag")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Accept advertising measurement" }));

    await waitFor(() => expect(screen.getByTestId("naqlk-google-ads-tag")).toBeTruthy());
    expect(screen.getByTestId("naqlk-google-ads-config")).toBeTruthy();
    expect(window.localStorage.getItem(CONSENT_KEY)).toBe("granted");
  });

  it("persists rejection without loading the Google tag", async () => {
    await renderConsent();

    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));

    expect(window.localStorage.getItem(CONSENT_KEY)).toBe("denied");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByTestId("naqlk-google-ads-tag")).toBeNull();
  });

  it("restores a previous acceptance", async () => {
    window.localStorage.setItem(CONSENT_KEY, "granted");

    await renderConsent();

    await waitFor(() => expect(screen.getByTestId("naqlk-google-ads-tag")).toBeTruthy());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("allows withdrawal from settings, updates loaded consent, and blocks later events", async () => {
    window.localStorage.setItem(CONSENT_KEY, "granted");
    const gtag = vi.fn();
    window.gtag = gtag;
    await renderConsent();
    await waitFor(() => expect(screen.getByTestId("naqlk-google-ads-tag")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Advertising privacy choices" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));

    await waitFor(() => expect(screen.queryByTestId("naqlk-google-ads-tag")).toBeNull());
    expect(window.localStorage.getItem(CONSENT_KEY)).toBe("denied");
    expect(gtag).toHaveBeenCalledWith("consent", "update", {
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "denied",
    });

    const { trackRequestStarted } = await import("@/lib/analytics/google-ads");
    trackRequestStarted("en");
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("fails closed and keeps the prompt visible when acceptance cannot be stored", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    await renderConsent();

    fireEvent.click(await screen.findByRole("button", { name: "Accept advertising measurement" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      screen.getByText(
        "We could not save your choice, so advertising measurement remains disabled.",
      ),
    ).toBeTruthy();
    expect(screen.queryByTestId("naqlk-google-ads-tag")).toBeNull();
  });

  it("provides the consent choices in Arabic", async () => {
    await renderConsent("ar");

    expect(await screen.findByRole("heading", { name: "خيارات خصوصية الإعلانات" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "قبول قياس الإعلانات" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "رفض" })).toBeTruthy();
  });
});
