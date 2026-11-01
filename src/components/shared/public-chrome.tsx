"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { readDraftProgress } from "@/features/public-request/lib/draft-storage";

export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    const cleanup = () => {
      try {
        readDraftProgress(window.localStorage);
      } catch {
        /* Storage may be disabled. */
      }
    };
    cleanup();
    const timer = window.setInterval(cleanup, 60_000);
    window.addEventListener("focus", cleanup);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", cleanup);
    };
  }, []);
  const staff =
    /^\/(ar|en)\/(dashboard|sales|operations|quality|finance|settings|admin)(?:\/|$)/.test(
      pathname,
    );
  return staff ? null : children;
}
