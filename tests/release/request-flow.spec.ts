import { expect, test } from "@playwright/test";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

const fixture = "http://127.0.0.1:54329";
const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=",
  "base64",
);

test.beforeEach(async ({ context, request }) => {
  await request.post(`${fixture}/__reset`, { data: {} });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" && ["3107", "54329"].includes(url.port))
      await route.continue();
    else await route.abort();
  });
});

for (const locale of ["ar", "en"] as const) {
  for (const scenario of ["without upload", "with upload", "rejected upload metadata"]) {
    const attachment = scenario !== "without upload";
    const rejectUpload = scenario === "rejected upload metadata";
    test(`${locale}: real server actions ${scenario}`, async ({ page, request }) => {
      const copy = locale === "ar" ? ar : en;
      if (rejectUpload) await request.post(`${fixture}/__reset`, { data: { rejectUploads: true } });
      await page.goto(`/${locale}/request`);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await page.getByRole("button", { name: copy.GoogleAdsConsent.reject, exact: true }).click();
      await page.getByRole("radio").first().check({ force: true });
      const next = () => page.getByRole("button", { name: copy.Request.next, exact: true }).click();
      await next();
      await page.locator("#pickup-city").selectOption("be0e668d-75fe-4249-8f09-dd9910f91bd0");
      await page.locator("#delivery-city").selectOption("b8b8d8d6-9ec4-4c15-b45c-825fa895ab21");
      await page.locator("#pickup-address").fill("Synthetic pickup street 123");
      await page.locator("#delivery-address").fill("Synthetic delivery street 456");
      await next();
      await page.locator("#cargo-description").fill("Synthetic fixture cargo only");
      await page.locator("#cargo-quantity").fill("2");
      if (attachment)
        await page
          .locator('input[type="file"]')
          .setInputFiles({ name: "fixture.png", mimeType: "image/png", buffer: image });
      await next();
      await page.locator("#full-name").fill("Synthetic Release Test");
      await page.locator("#mobile").fill("0500000000");
      await page.locator("#email").fill("release@example.invalid");
      await next();
      await page.locator('input[type="checkbox"]').check();
      await expect
        .poll(async () => page.evaluate(() => localStorage.getItem("naqlk.public-request.v2")))
        .not.toBeNull();
      const saved = await page.evaluate(() => localStorage.getItem("naqlk.public-request.v2"));
      expect(saved).not.toContain("Synthetic");
      expect(saved).not.toContain("0500000000");
      await page.getByRole("button", { name: copy.Request.submit, exact: true }).click();
      if (rejectUpload) {
        await expect(
          page.getByText(copy.Request.errors.uploadFailed, { exact: true }),
        ).toBeVisible();
        await expect
          .poll(async () => (await (await request.get(`${fixture}/__state`)).json()).removedUploads)
          .toBe(1);
        const state = await (await request.get(`${fixture}/__state`)).json();
        expect(state.submissions).toHaveLength(0);
        expect(state.uploads).toBe(0);
        expect(
          await page.evaluate(() => localStorage.getItem("naqlk.public-request.v2")),
        ).not.toBeNull();
        return;
      }
      await expect(page).toHaveURL(
        new RegExp(`/${locale}/request/success\\?reference=NQ-261101-000001`),
      );
      await expect(page.getByText("NQ-261101-000001", { exact: true })).toBeVisible();
      const state = await (await request.get(`${fixture}/__state`)).json();
      expect(state.submissions).toHaveLength(1);
      expect(state.submissions[0].request_payload.locale).toBe(locale);
      expect(state.submissions[0].request_payload.contact.mobile).toBe("+966500000000");
      expect(state.submissions[0].attachment_payload).toHaveLength(attachment ? 1 : 0);
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("naqlk.public-request.v2")))
        .toBeNull();
    });
  }

  test(`${locale}: pages, consent, WhatsApp and telephone destinations`, async ({ page }) => {
    const copy = locale === "ar" ? ar : en;
    await page.goto(`/${locale}`);
    await expect(page.locator("h1")).toBeVisible();
    await page.getByRole("button", { name: copy.GoogleAdsConsent.accept, exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("naqlk:google-ads:consent:v1")))
      .toBe("granted");
    // Advertising is disabled for this build, including after acceptance.
    await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
    await page.getByRole("button", { name: copy.GoogleAdsConsent.manage, exact: true }).click();
    await page.getByRole("button", { name: copy.GoogleAdsConsent.reject, exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("naqlk:google-ads:consent:v1")))
      .toBe("denied");
    await page
      .locator("footer")
      .getByRole("button", { name: copy.Common.whatsapp, exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator('a[href^="https://wa.me/"]')).toHaveCount(2);
    await expect(dialog.locator('a[href="tel:+966547349947"]')).toBeVisible();
    await expect(dialog.locator('a[href="tel:+966565845386"]')).toBeVisible();
    const whatsapp = new URL(
      (await dialog.locator('a[href^="https://wa.me/"]').first().getAttribute("href")) ?? "",
    );
    expect(whatsapp.searchParams.get("text")).toBeTruthy();
    // Exercise click handlers without opening WhatsApp, placing calls, or sending Ads.
    await dialog
      .locator('a[href^="tel:"]')
      .first()
      .evaluate((link) => link.addEventListener("click", (event) => event.preventDefault()));
    await dialog.locator('a[href^="tel:"]').first().click();
    await expect(dialog).toHaveCount(0);
    await page
      .locator("footer")
      .getByRole("button", { name: copy.Common.whatsapp, exact: true })
      .click();
    await dialog
      .locator('a[href^="https://wa.me/"]')
      .first()
      .evaluate((link) => link.addEventListener("click", (event) => event.preventDefault()));
    await dialog.locator('a[href^="https://wa.me/"]').first().click();
    await expect(dialog).toHaveCount(0);
    await page.goto(`/${locale}/privacy`);
    await expect(page.getByRole("heading", { name: copy.Privacy.draftTitle })).toBeVisible();
  });
}
