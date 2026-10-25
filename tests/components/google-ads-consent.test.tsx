import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

const navigation = vi.hoisted(() => ({ pathname: "/en/request" }));

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

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

const CONSENT_KEY = "naqlk:google-ads:consent:v1";

async function renderConsent(
  locale: "ar" | "en" = "en",
  initialUrl = `/${locale}/request?reference=fake-sensitive-reference`,
) {
  vi.resetModules();
  const [{ GoogleAdsConsentManager }, { GoogleAdsConsentSettingsButton }, { GoogleAdsTag }] =
    await Promise.all([
      import("@/components/analytics/google-ads-consent-manager"),
      import("@/components/analytics/google-ads-consent-settings-button"),
      import("@/components/analytics/google-ads-tag"),
    ]);

  const setUrl = (url: string) => {
    window.history.replaceState({}, "", url);
    navigation.pathname = new URL(url, window.location.origin).pathname;
  };
  const ui = () => (
    <NextIntlClientProvider locale={locale} messages={locale === "ar" ? ar : en}>
      <GoogleAdsTag />
      <GoogleAdsConsentSettingsButton />
      <GoogleAdsConsentManager />
    </NextIntlClientProvider>
  );

  setUrl(initialUrl);
  const result = render(ui());
  return {
    ...result,
    navigate(url: string) {
      setUrl(url);
      result.rerender(ui());
    },
  };
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS_TESTING", "true");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED", "true");
  navigation.pathname = "/en/request";
  window.history.replaceState({}, "", "/en/request");
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
    const config = screen.getByTestId("naqlk-google-ads-config");
    expect(config.textContent).toContain("send_page_view: false");
    expect(config.textContent).toContain("page_referrer: ''");
    expect(config.textContent).toContain('window.location.origin + "/en/request"');
    expect(config.textContent).not.toContain("fake-sensitive-reference");
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
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", {
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "denied",
    });

    const { trackRequestStarted } = await import("@/lib/analytics/google-ads");
    trackRequestStarted("en");
    expect(gtag).toHaveBeenCalledTimes(2);
  });

  it.each([
    "/en/quote/fake-quote-token?reference=fake-reference",
    "/ar/track/fake-tracking-token?phone=fake-phone",
    "/en/account",
    "/ar/login",
    "/en/request/success?reference=fake-reference",
  ])("does not load the tag on a direct sensitive route: %s", async (url) => {
    window.localStorage.setItem(CONSENT_KEY, "granted");
    await renderConsent(url.startsWith("/ar/") ? "ar" : "en", url);

    await waitFor(() => expect(screen.queryByTestId("naqlk-google-ads-tag")).toBeNull());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("denies consent after public-to-private navigation and restores it on return", async () => {
    window.localStorage.setItem(CONSENT_KEY, "granted");
    const gtag = vi.fn();
    window.gtag = gtag;
    const view = await renderConsent();
    await waitFor(() => expect(screen.getByTestId("naqlk-google-ads-tag")).toBeTruthy());

    view.navigate("/en/quote/fake-quote-token?reference=fake-reference");

    await waitFor(() => expect(screen.queryByTestId("naqlk-google-ads-tag")).toBeNull());
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", {
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "denied",
    });

    const callsBeforeBlockedEvent = gtag.mock.calls.length;
    const { trackRequestStarted } = await import("@/lib/analytics/google-ads");
    trackRequestStarted("en");
    expect(gtag).toHaveBeenCalledTimes(callsBeforeBlockedEvent);

    view.navigate("/en/request?reference=another-fake-reference");

    await waitFor(() => expect(screen.getByTestId("naqlk-google-ads-tag")).toBeTruthy());
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", {
      ad_personalization: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      analytics_storage: "granted",
    });
  });

  it("keeps a loaded tag denied when consent storage syncs on a sensitive route", async () => {
    window.localStorage.setItem(CONSENT_KEY, "granted");
    const gtag = vi.fn();
    window.gtag = gtag;
    const view = await renderConsent();
    await waitFor(() => expect(screen.getByTestId("naqlk-google-ads-tag")).toBeTruthy());

    view.navigate("/en/account?token=fake-sensitive-token");
    window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_KEY, newValue: "granted" }));

    expect(gtag).toHaveBeenLastCalledWith("consent", "update", {
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "denied",
    });
  });

  it("stores consent on the privacy page without granting a loaded tag there", async () => {
    window.localStorage.setItem(CONSENT_KEY, "granted");
    const gtag = vi.fn();
    window.gtag = gtag;
    const view = await renderConsent();
    await waitFor(() => expect(screen.getByTestId("naqlk-google-ads-tag")).toBeTruthy());

    view.navigate("/en/privacy");
    fireEvent.click(screen.getByRole("button", { name: "Advertising privacy choices" }));
    fireEvent.click(await screen.findByRole("button", { name: "Accept advertising measurement" }));

    expect(window.localStorage.getItem(CONSENT_KEY)).toBe("granted");
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", {
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "denied",
    });
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
