"use client";

import { MessageCircleMore, Phone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  CONTACT_NUMBERS,
  getContactTelephoneHref,
  getContactWhatsAppHref,
  type ContactNumber,
} from "@/config/contact";
import { cn } from "@/utils/cn";
import { trackWhatsAppOpened } from "@/lib/analytics/google-ads";

type ContactNumberPickerProps = {
  message: string;
  allowCall?: boolean;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};

type Position = { left: number; placement: "above" | "below"; top: number };

const CONTACT_PICKER_OPEN_EVENT = "naqlk:contact-picker-open";

export function ContactNumberPicker({
  allowCall = false,
  ariaLabel,
  children,
  className,
  message,
}: ContactNumberPickerProps) {
  const t = useTranslations("ContactPicker");
  const pickerId = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const closeOtherPicker = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== pickerId) setOpen(false);
    };
    window.addEventListener(CONTACT_PICKER_OPEN_EVENT, closeOtherPicker);
    return () => window.removeEventListener(CONTACT_PICKER_OPEN_EVENT, closeOtherPicker);
  }, [pickerId]);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        triggerRef.current?.focus({ preventScroll: true });
        wasOpenRef.current = false;
      }
      return;
    }

    wasOpenRef.current = true;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(panel.offsetWidth || 352, window.innerWidth - 24);
      const height = panel.offsetHeight;
      const gap = 8;
      const margin = 12;
      const canOpenBelow = window.innerHeight - rect.bottom >= height + gap;
      const placement = canOpenBelow || rect.top < height + gap ? "below" : "above";
      const top = placement === "below" ? rect.bottom + gap : rect.top - height - gap;
      const rtl = document.documentElement.dir === "rtl";
      const preferredLeft = rtl ? rect.right - width : rect.left;
      const left = Math.max(margin, Math.min(preferredLeft, window.innerWidth - width - margin));
      setPosition({ left, placement, top: Math.max(margin, top) });
    };

    const focusFirstAction = () => {
      updatePosition();
      panelRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus();
    };
    const frame = window.requestAnimationFrame(focusFirstAction);
    const onViewportChange = () => updatePosition();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openPicker = () => {
    window.dispatchEvent(new CustomEvent(CONTACT_PICKER_OPEN_EVENT, { detail: pickerId }));
    setOpen(true);
  };
  const closePicker = () => setOpen(false);

  return (
    <>
      <button
        aria-controls={open ? `${pickerId}-panel` : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className={className}
        onClick={openPicker}
        ref={triggerRef}
        type="button"
      >
        {children}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[70] w-[min(22rem,calc(100vw-1.5rem))]"
              id={`${pickerId}-panel`}
              ref={panelRef}
              style={
                position
                  ? { left: position.left, top: position.top }
                  : { left: 12, top: 12, opacity: 0, pointerEvents: "none" }
              }
            >
              <div
                className="rounded-xl border border-border bg-card p-3 text-foreground shadow-xl"
                dir="auto"
                aria-labelledby={`${pickerId}-title`}
                role="dialog"
              >
                <div className="flex items-start justify-between gap-3 px-1 pb-2">
                  <div>
                    <h2 className="text-sm font-black" id={`${pickerId}-title`}>
                      {t("title")}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">{t("description")}</p>
                  </div>
                  <button
                    aria-label={t("close")}
                    className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={closePicker}
                    ref={closeRef}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
                {CONTACT_NUMBERS.length ? (
                  <div className="grid gap-2">
                    {CONTACT_NUMBERS.map((contact) => (
                      <ContactOption
                        allowCall={allowCall}
                        contact={contact}
                        key={contact.id}
                        message={message}
                        onComplete={closePicker}
                        t={t}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    {t("unavailable")}
                  </p>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ContactOption({
  allowCall,
  contact,
  message,
  onComplete,
  t,
}: {
  allowCall: boolean;
  contact: ContactNumber;
  message: string;
  onComplete: () => void;
  t: (key: string) => string;
}) {
  const whatsappHref = getContactWhatsAppHref(contact.phone, message);
  const telephoneHref = getContactTelephoneHref(contact.phone);
  return (
    <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2">
      <p className="min-w-0 truncate font-mono text-sm font-bold" dir="ltr">
        {contact.phone}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        {whatsappHref ? (
          <a
            aria-label={`${t("whatsapp")} ${contact.phone}`}
            className={cn(
              buttonVariants({ size: "icon" }),
              "size-9 bg-emerald-600 px-0 hover:bg-emerald-700",
            )}
            href={whatsappHref}
            onClick={() => {
              trackWhatsAppOpened();
              onComplete();
            }}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircleMore aria-hidden="true" className="size-4" />
          </a>
        ) : null}
        {allowCall && telephoneHref ? (
          <a
            aria-label={`${t("call")} ${contact.phone}`}
            className={cn(buttonVariants({ size: "icon", variant: "outline" }), "size-9 px-0")}
            href={telephoneHref}
            onClick={onComplete}
          >
            <Phone aria-hidden="true" className="size-4" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
