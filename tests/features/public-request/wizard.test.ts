import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  createEmptyRequestDraft,
  toPublicRequestPayload,
  validateWizardStep,
} from "@/features/public-request/lib/wizard";
import { sanitizeSaudiMobileInput } from "@/features/public-request/lib/validation";
import type { PublicRequestCatalog } from "@/features/public-request/types/public-request";

const catalog: PublicRequestCatalog = {
  cities: [
    {
      id: "be0e668d-75fe-4249-8f09-dd9910f91bd0",
      name: "الرياض",
      region: "الرياض",
      slug: "riyadh",
    },
    { id: "b8b8d8d6-9ec4-4c15-b45c-825fa895ab21", name: "جدة", region: "مكة", slug: "jeddah" },
  ],
  options: [],
  services: [
    {
      description: "نقل آمن للأثاث",
      id: "018a0600-3fb9-45e7-bea4-3e7390d1e730",
      key: "furniture_moving",
      name: "نقل الأثاث",
      scope: "both",
    },
  ],
};

describe("public request wizard rules", () => {
  it("tracks confirmation only after a successful server completion", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/features/public-request/components/request-wizard.tsx"),
      "utf8",
    );
    const alreadyComplete = source.indexOf('preparation.status === "already_complete"');
    const completeAction = source.indexOf("await completePublicRequestAction");
    const completionError = source.indexOf('completion.status === "error"');
    const tracking = source.indexOf("trackRequestConfirmed(draft.submissionId, locale)");

    expect(alreadyComplete).toBeGreaterThan(-1);
    expect(completeAction).toBeGreaterThan(alreadyComplete);
    expect(completionError).toBeGreaterThan(completeAction);
    expect(tracking).toBeGreaterThan(completionError);
  });

  it("reports only the current step's missing fields", () => {
    const draft = createEmptyRequestDraft("ar");

    expect(validateWizardStep(1, draft, catalog)).toEqual({ serviceId: "selectService" });
    expect(validateWizardStep(3, draft, catalog)).toEqual({
      cargoDescription: "cargoDescription",
    });
  });

  it("rejects alphabetic wizard input after client sanitization", () => {
    const draft = {
      ...createEmptyRequestDraft("en"),
      contact: {
        email: "",
        fullName: "A Customer",
        mobile: sanitizeSaudiMobileInput("055abc123456"),
        notes: "",
      },
    };

    expect(validateWizardStep(4, draft, catalog).mobile).toBe("mobile");
  });

  it("produces the normalized submission contract", () => {
    const draft = {
      ...createEmptyRequestDraft("ar"),
      cargoDescription: "أثاث غرفة كاملة",
      consentAccepted: true,
      contact: {
        email: "TEST@EXAMPLE.COM",
        fullName: " محمد أحمد ",
        mobile: "055 123 4567",
        notes: "",
      },
      delivery: {
        cityId: catalog.cities[1].id,
        formattedAddress: " حي الشاطئ، شارع الأمير ",
        latitude: null,
        longitude: null,
      },
      pickup: {
        cityId: catalog.cities[0].id,
        formattedAddress: " حي الياسمين، طريق الملك ",
        latitude: null,
        longitude: null,
      },
      quantity: "4",
      serviceId: catalog.services[0].id,
    };

    const payload = toPublicRequestPayload(draft);

    expect(payload.contact.mobile).toBe("+966551234567");
    expect(payload.contact.email).toBe("test@example.com");
    expect(payload.contact.fullName).toBe("محمد أحمد");
    expect(payload.quantity).toBe(4);
    expect(payload.consentAccepted).toBe(true);
    expect(payload.honeypot).toBe("");
  });

  it("preserves anti-abuse and consent signals for server validation", () => {
    const payload = toPublicRequestPayload({
      ...createEmptyRequestDraft("en"),
      consentAccepted: false,
      honeypot: "bot-filled-value",
    });

    expect(payload.consentAccepted).toBe(false);
    expect(payload.honeypot).toBe("bot-filled-value");
  });
});
