import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRequestDraft } from "@/features/public-request/hooks/use-request-draft";
import {
  DRAFT_STORAGE_KEY,
  DRAFT_TTL_MS,
  readDraftProgress,
  saveDraftProgress,
} from "@/features/public-request/lib/draft-storage";
import { createEmptyRequestDraft } from "@/features/public-request/lib/wizard";

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("request draft privacy and lifecycle", () => {
  it("persists only selected progress while keeping personal fields usable in memory", () => {
    const { result } = renderHook(() => useRequestDraft("en"));
    act(() =>
      result.current.setDraft((draft) => ({
        ...draft,
        serviceId: "service",
        cargoDescription: "private cargo",
        consentAccepted: true,
        contact: {
          fullName: "Private Person",
          mobile: "0500000000",
          email: "private@example.com",
          notes: "secret",
        },
        pickup: {
          cityId: "city",
          formattedAddress: "private address",
          latitude: 24,
          longitude: 46,
        },
      })),
    );
    act(() => vi.advanceTimersByTime(300));
    const saved = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!);
    expect(Object.keys(saved).sort()).toEqual([
      "deliveryCityId",
      "expiresAt",
      "pickupCityId",
      "quantity",
      "selectedOptionIds",
      "serviceId",
    ]);
    expect(saved.pickupCityId).toBe("city");
    expect(result.current.draft.contact.fullName).toBe("Private Person");
    expect(result.current.draft.pickup.latitude).toBe(24);
  });

  it("restores safe selections with fresh consent and submission identity", () => {
    const draft = createEmptyRequestDraft("ar");
    draft.serviceId = "service";
    saveDraftProgress(localStorage, draft);
    const { result } = renderHook(() => useRequestDraft("en"));
    expect(result.current.draft.serviceId).toBe("service");
    expect(result.current.draft.locale).toBe("en");
    expect(result.current.draft.consentAccepted).toBe(false);
    expect(result.current.draft.submissionId).not.toBe(draft.submissionId);
    expect(result.current.draft.contact.fullName).toBe("");
  });

  it("removes legacy, expired, malformed and invalid drafts", () => {
    localStorage.setItem("naqlk.public-request.v1", '{"contact":{"fullName":"private"}}');
    saveDraftProgress(localStorage, createEmptyRequestDraft("en"));
    act(() => vi.advanceTimersByTime(DRAFT_TTL_MS));
    expect(readDraftProgress(localStorage)).toBeNull();
    expect(localStorage.getItem("naqlk.public-request.v1")).toBeNull();
    for (const raw of ["{", "{}", JSON.stringify({ expiresAt: Date.now() + 1 })]) {
      localStorage.setItem(DRAFT_STORAGE_KEY, raw);
      expect(readDraftProgress(localStorage)).toBeNull();
      expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    }
  });

  it("cancels pending saves after successful submission", () => {
    const { result } = renderHook(() => useRequestDraft("en"));
    act(() => result.current.clearDraft());
    act(() => vi.advanceTimersByTime(1000));
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("keeps the form usable when storage access is denied", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { result } = renderHook(() => useRequestDraft("en"));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.hydrated).toBe(true);
    expect(result.current.saveStatus).toBe("unavailable");
    expect(() => act(() => result.current.clearDraft())).not.toThrow();
  });
});
