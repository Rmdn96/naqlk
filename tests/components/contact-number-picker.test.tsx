import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContactNumberPicker } from "@/components/shared/contact-number-picker";
import { CONTACT_NUMBERS } from "@/config/contact";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

const analytics = vi.hoisted(() => ({ trackWhatsAppOpened: vi.fn() }));

vi.mock("@/lib/analytics/google-ads", () => analytics);

const originalContacts = CONTACT_NUMBERS.map((contact) => ({ ...contact }));

afterEach(() => {
  cleanup();
  analytics.trackWhatsAppOpened.mockClear();
  CONTACT_NUMBERS.splice(
    0,
    CONTACT_NUMBERS.length,
    ...originalContacts.map((contact) => ({ ...contact })),
  );
});

function renderPicker() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ContactNumberPicker message="Hello Naqlk" allowCall>
        Contact us
      </ContactNumberPicker>
    </NextIntlClientProvider>,
  );
}

function renderArabicPicker() {
  return render(
    <NextIntlClientProvider locale="ar" messages={ar}>
      <ContactNumberPicker message="تواصل مع نقلك">تواصل معنا</ContactNumberPicker>
    </NextIntlClientProvider>,
  );
}

function renderTwoPickers() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ContactNumberPicker message="First message">First contact</ContactNumberPicker>
      <ContactNumberPicker message="Second message">Second contact</ContactNumberPicker>
    </NextIntlClientProvider>,
  );
}

describe("ContactNumberPicker", () => {
  it("does not create a contact link or redirect before selection", () => {
    renderPicker();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Contact us" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(4);
    expect(screen.getByRole("dialog").parentElement?.className).toContain("100vw");
  });

  it("does not move focus to a picker trigger during initial hydration", () => {
    renderTwoPickers();
    expect(document.activeElement).toBe(document.body);
  });

  it("renders additions and removals from the config automatically", () => {
    CONTACT_NUMBERS.push({ id: "contact-3", phone: "0570000000" });
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Contact us" }));
    expect(screen.getAllByText("0570000000")).toHaveLength(1);
    expect(screen.getAllByRole("link")).toHaveLength(6);

    CONTACT_NUMBERS.splice(1, 1);
    cleanup();
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Contact us" }));
    expect(screen.queryByText("0565845386")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("preserves the booking/contact message in the selected WhatsApp link", () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Contact us" }));
    const whatsappLink = screen.getAllByRole("link", { name: /WhatsApp/ })[0];
    expect(whatsappLink.getAttribute("href")).toContain("text=Hello+Naqlk");
  });

  it("tracks exactly once only when a real WhatsApp link is clicked", () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Contact us" }));
    expect(analytics.trackWhatsAppOpened).not.toHaveBeenCalled();

    const whatsappLink = screen.getAllByRole("link", { name: /WhatsApp/ })[0];
    const href = whatsappLink.getAttribute("href");
    fireEvent.click(whatsappLink);

    expect(analytics.trackWhatsAppOpened).toHaveBeenCalledTimes(1);
    expect(whatsappLink.getAttribute("href")).toBe(href);
  });

  it("uses the Arabic translations while keeping phone values LTR", () => {
    renderArabicPicker();
    fireEvent.click(screen.getByRole("button", { name: "تواصل معنا" }));
    expect(screen.getByRole("heading", { name: "اختر رقم التواصل" })).toBeTruthy();
    expect(screen.getByText("0547349947").getAttribute("dir")).toBe("ltr");
    expect(screen.getAllByRole("link", { name: /واتساب/ })).toHaveLength(2);
  });

  it("shows a graceful empty state without creating links", () => {
    CONTACT_NUMBERS.splice(0, CONTACT_NUMBERS.length);
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Contact us" }));
    expect(screen.getByText("No contact numbers are currently available.")).toBeTruthy();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("closes on outside click and Escape and never leaves two pickers open", () => {
    renderTwoPickers();
    const triggers = screen.getAllByRole("button");
    fireEvent.click(triggers[0]);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(triggers[1]);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(triggers[0]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(triggers[0]);
  });
});
