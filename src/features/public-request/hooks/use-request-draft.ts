"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DRAFT_STORAGE_KEY,
  readDraftProgress,
  saveDraftProgress,
} from "@/features/public-request/lib/draft-storage";
import { createEmptyRequestDraft } from "@/features/public-request/lib/wizard";
import type { PublicRequestDraft } from "@/features/public-request/types/public-request";
import type { AppLocale } from "@/i18n/routing";

type DraftSaveStatus = "idle" | "saved" | "saving" | "unavailable";

export function useRequestDraft(locale: AppLocale) {
  const [draft, setDraft] = useState<PublicRequestDraft>(() => createEmptyRequestDraft(locale));
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleared = useRef(false);

  useEffect(() => {
    try {
      const progress = readDraftProgress(window.localStorage);
      if (progress) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage hydration.
        setDraft((current) => ({
          ...current,
          locale,
          serviceId: progress.serviceId,
          quantity: progress.quantity,
          selectedOptionIds: progress.selectedOptionIds,
          pickup: { ...current.pickup, cityId: progress.pickupCityId },
          delivery: { ...current.delivery, cityId: progress.deliveryCityId },
        }));
      }
    } catch {
      setSaveStatus("unavailable");
    } finally {
      setHydrated(true);
    }
  }, [locale]);

  useEffect(() => {
    if (!hydrated || cleared.current) {
      return;
    }

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => {
      try {
        saveDraftProgress(window.localStorage, draft);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unavailable");
      }
    }, 300);

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [draft, hydrated]);

  const clearDraft = useCallback(() => {
    cleared.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      window.localStorage.removeItem("naqlk.public-request.v1");
    } catch {
      // Storage restrictions must not interrupt successful submission.
    }
  }, []);

  return { clearDraft, draft, hydrated, saveStatus, setDraft };
}
