import { z } from "zod";

import { PUBLIC_REQUEST_DRAFT_VERSION } from "@/config/public-request";
import type { PublicRequestDraft } from "@/features/public-request/types/public-request";

export const DRAFT_STORAGE_KEY = `naqlk.public-request.v${PUBLIC_REQUEST_DRAFT_VERSION}`;
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const progressSchema = z.object({
  expiresAt: z.number().int().positive(),
  serviceId: z.string().max(64),
  pickupCityId: z.string().max(64),
  deliveryCityId: z.string().max(64),
  quantity: z.string().max(6),
  selectedOptionIds: z.array(z.string().uuid()).max(10),
});

// Free text, exact locations, contact details, consent, and submission IDs stay in memory.
export function saveDraftProgress(storage: Storage, draft: PublicRequestDraft): void {
  storage.setItem(
    DRAFT_STORAGE_KEY,
    JSON.stringify({
      expiresAt: Date.now() + DRAFT_TTL_MS,
      serviceId: draft.serviceId,
      pickupCityId: draft.pickup.cityId,
      deliveryCityId: draft.delivery.cityId,
      quantity: draft.quantity,
      selectedOptionIds: draft.selectedOptionIds,
    }),
  );
}

export function readDraftProgress(storage: Storage) {
  // Delete the previous full draft rather than migrating personal information.
  storage.removeItem("naqlk.public-request.v1");
  const raw = storage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const result = progressSchema.safeParse(JSON.parse(raw));
    if (
      result.success &&
      result.data.expiresAt > Date.now() &&
      result.data.expiresAt <= Date.now() + DRAFT_TTL_MS
    )
      return result.data;
  } catch {
    // Malformed storage must not prevent form use.
  }
  storage.removeItem(DRAFT_STORAGE_KEY);
  return null;
}
