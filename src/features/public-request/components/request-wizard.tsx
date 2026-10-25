"use client";

import { ArrowLeft, ArrowRight, Check, LoaderCircle, Save } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  PUBLIC_REQUEST_ALLOWED_MIME_TYPES,
  PUBLIC_REQUEST_MAX_FILE_BYTES,
  PUBLIC_REQUEST_MAX_FILES,
  type PublicRequestMimeType,
} from "@/config/public-request";
import {
  cancelPreparedUploadsAction,
  completePublicRequestAction,
  preparePublicRequestAction,
} from "@/features/public-request/actions/public-request.actions";
import { useRequestDraft } from "@/features/public-request/hooks/use-request-draft";
import {
  publicRequestPayloadSchema,
  publicUploadDescriptorsSchema,
} from "@/features/public-request/lib/validation";
import {
  toPublicRequestPayload,
  validateWizardStep,
  type WizardErrors,
} from "@/features/public-request/lib/wizard";
import { AddressStep } from "@/features/public-request/components/steps/address-step";
import {
  CargoStep,
  type SelectedPhoto,
} from "@/features/public-request/components/steps/cargo-step";
import { ContactStep } from "@/features/public-request/components/steps/contact-step";
import { ReviewStep } from "@/features/public-request/components/steps/review-step";
import { ServiceStep } from "@/features/public-request/components/steps/service-step";
import type {
  CompletedUpload,
  PreparedUpload,
  PublicRequestCatalog,
} from "@/features/public-request/types/public-request";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { trackRequestConfirmed, trackRequestStarted } from "@/lib/analytics/google-ads";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/utils/cn";

const TOTAL_STEPS = 5;

async function hashFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

type RequestWizardProps = {
  catalog: PublicRequestCatalog;
  initialCityId?: string;
  initialDeliveryCityId?: string;
  initialPickupCityId?: string;
  initialServiceId?: string;
};

export function RequestWizard({
  catalog,
  initialCityId,
  initialDeliveryCityId,
  initialPickupCityId,
  initialServiceId,
}: RequestWizardProps) {
  const locale = useLocale() as "ar" | "en";
  const t = useTranslations("Request");
  const router = useRouter();
  const { clearDraft, draft, hydrated, saveStatus, setDraft } = useRequestDraft(locale);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<WizardErrors>({});
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [fileError, setFileError] = useState<string>();
  const [submissionError, setSubmissionError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const prefillApplied = useRef(false);
  const requestStartedTracked = useRef(false);
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;
  const NextIcon = locale === "ar" ? ArrowLeft : ArrowRight;
  const stepNames = useMemo(
    () => [t("step1"), t("step2"), t("step3"), t("step4"), t("step5")],
    [t],
  );

  useEffect(() => {
    if (!hydrated || prefillApplied.current) return;
    prefillApplied.current = true;
    setDraft((current) => {
      if (current.serviceId || current.pickup.cityId || current.delivery.cityId) return current;
      return {
        ...current,
        delivery: {
          ...current.delivery,
          cityId: initialDeliveryCityId ?? initialCityId ?? "",
        },
        pickup: {
          ...current.pickup,
          cityId: initialPickupCityId ?? initialCityId ?? "",
        },
        serviceId: initialServiceId ?? "",
      };
    });
  }, [
    hydrated,
    initialCityId,
    initialDeliveryCityId,
    initialPickupCityId,
    initialServiceId,
    setDraft,
  ]);

  const translatedErrors = useMemo(
    () =>
      Object.fromEntries(Object.entries(errors).map(([field, key]) => [field, t(`errors.${key}`)])),
    [errors, t],
  );

  const focusErrors = () => {
    requestAnimationFrame(() => errorSummaryRef.current?.focus());
  };

  const goNext = () => {
    const nextErrors = validateWizardStep(step, draft, catalog);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusErrors();
      return;
    }

    setStep((current) => Math.min(TOTAL_STEPS, current + 1));
    window.scrollTo({ behavior: "smooth", top: 0 });
  };

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files ?? []);
    setFileError(undefined);

    if (photos.length + incomingFiles.length > PUBLIC_REQUEST_MAX_FILES) {
      setFileError(t("errors.fileCount"));
      event.target.value = "";
      return;
    }

    const nextPhotos: SelectedPhoto[] = [];

    for (const file of incomingFiles) {
      if (!PUBLIC_REQUEST_ALLOWED_MIME_TYPES.includes(file.type as PublicRequestMimeType)) {
        setFileError(t("errors.fileType"));
        event.target.value = "";
        return;
      }

      if (file.size > PUBLIC_REQUEST_MAX_FILE_BYTES) {
        setFileError(t("errors.fileSize"));
        event.target.value = "";
        return;
      }

      nextPhotos.push({ file, id: crypto.randomUUID() });
    }

    setPhotos((current) => [...current, ...nextPhotos]);
    event.target.value = "";
  };

  const uploadFiles = async (preparedUploads: PreparedUpload[]): Promise<CompletedUpload[]> => {
    const supabase = createBrowserSupabaseClient();

    return Promise.all(
      preparedUploads.map(async (prepared) => {
        const selectedPhoto = photos.find((photo) => photo.id === prepared.id);

        if (!selectedPhoto) {
          throw new Error("SELECTED_FILE_NOT_FOUND");
        }

        const { error } = await supabase.storage
          .from("attachments")
          .uploadToSignedUrl(prepared.path, prepared.token, selectedPhoto.file, {
            cacheControl: "3600",
            contentType: prepared.mimeType,
          });

        if (error) {
          throw new Error("SIGNED_UPLOAD_FAILED", { cause: error });
        }

        return {
          checksumSha256: await hashFile(selectedPhoto.file),
          id: prepared.id,
          mimeType: prepared.mimeType,
          name: prepared.name,
          path: prepared.path,
          size: prepared.size,
        };
      }),
    );
  };

  const submitRequest = async () => {
    setSubmissionError(undefined);

    for (let candidateStep = 1; candidateStep <= TOTAL_STEPS; candidateStep += 1) {
      const candidateErrors = validateWizardStep(candidateStep, draft, catalog);

      if (Object.keys(candidateErrors).length > 0) {
        setErrors(candidateErrors);
        setStep(candidateStep);
        focusErrors();
        return;
      }
    }

    const payloadResult = publicRequestPayloadSchema.safeParse(toPublicRequestPayload(draft));
    const descriptorResult = publicUploadDescriptorsSchema.safeParse(
      photos.map(({ file, id }) => ({ id, mimeType: file.type, name: file.name, size: file.size })),
    );

    if (!payloadResult.success || !descriptorResult.success) {
      setSubmissionError(t("errors.invalidRequest"));
      focusErrors();
      return;
    }

    setSubmitting(true);
    let preparedPaths: string[] = [];

    try {
      const preparation = await preparePublicRequestAction(
        payloadResult.data,
        descriptorResult.data,
      );

      if (preparation.status === "error") {
        setSubmissionError(
          preparation.error === "invalid_request"
            ? t("errors.invalidRequest")
            : t("errors.serviceUnavailable"),
        );
        focusErrors();
        return;
      }

      if (preparation.status === "already_complete") {
        clearDraft();
        router.push({ pathname: "/request/success", query: { reference: preparation.reference } });
        return;
      }

      preparedPaths = preparation.uploads.map((upload) => upload.path);
      const uploadedFiles = await uploadFiles(preparation.uploads);
      const completion = await completePublicRequestAction(payloadResult.data, uploadedFiles);

      if (completion.status === "error") {
        setSubmissionError(
          completion.error === "upload_verification_failed"
            ? t("errors.uploadFailed")
            : completion.error === "invalid_request"
              ? t("errors.invalidRequest")
              : t("errors.serviceUnavailable"),
        );
        focusErrors();
        return;
      }

      // Only a newly completed server transaction may emit the confirmation and Ads conversion.
      trackRequestConfirmed(draft.submissionId, locale);
      clearDraft();
      router.push({ pathname: "/request/success", query: { reference: completion.reference } });
    } catch {
      await cancelPreparedUploadsAction(draft.submissionId, preparedPaths);
      setSubmissionError(t("errors.uploadFailed"));
      focusErrors();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!requestStartedTracked.current) {
      requestStartedTracked.current = true;
      trackRequestStarted(locale);
    }

    if (step === TOTAL_STEPS) {
      void submitRequest();
    } else {
      goNext();
    }
  };

  if (!hydrated) {
    return (
      <Card aria-busy="true" className="min-h-[34rem] animate-pulse bg-card p-6 sm:p-8">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="mt-8 h-8 w-2/3 rounded bg-muted" />
        <div className="mt-5 h-48 rounded-lg bg-muted" />
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/45 px-4 py-5 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-black text-primary">
              {t("stepLabel", { current: step, total: TOTAL_STEPS })}
            </p>
            <p
              aria-live="polite"
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"
            >
              {saveStatus === "saving" ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="size-4" />
              )}
              {saveStatus === "saving" ? t("saving") : t("saved")}
            </p>
          </div>
          <ol
            className="mt-5 grid grid-cols-5 gap-2"
            aria-label={t("stepLabel", { current: step, total: TOTAL_STEPS })}
          >
            {stepNames.map((name, index) => {
              const number = index + 1;
              const complete = number < step;
              const current = number === step;

              return (
                <li aria-current={current ? "step" : undefined} className="min-w-0" key={name}>
                  <div
                    className={cn(
                      "h-1.5 rounded-full bg-border",
                      (complete || current) && "bg-primary",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-2 hidden truncate text-xs font-semibold text-muted-foreground sm:block",
                      current && "text-primary",
                    )}
                  >
                    {complete ? <Check aria-hidden="true" className="me-1 inline size-3" /> : null}
                    {name}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="p-5 sm:p-8">
          <div className="max-w-3xl">
            <h2 className="text-balance text-2xl font-black sm:text-3xl">
              {t(`step${step}Title`)}
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">{t(`step${step}Description`)}</p>
          </div>

          {(Object.keys(errors).length > 0 || submissionError) && (
            <div
              className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm font-semibold text-destructive"
              ref={errorSummaryRef}
              role="alert"
              tabIndex={-1}
            >
              {submissionError ?? t("errors.invalidRequest")}
            </div>
          )}

          <div className="mt-8">
            {step === 1 ? (
              <ServiceStep
                catalog={catalog}
                draft={draft}
                error={translatedErrors.serviceId}
                onChange={setDraft}
              />
            ) : null}
            {step === 2 ? (
              <AddressStep
                cities={catalog.cities}
                delivery={draft.delivery}
                errors={translatedErrors}
                onDeliveryChange={(delivery) => setDraft({ ...draft, delivery })}
                onPickupChange={(pickup) => setDraft({ ...draft, pickup })}
                pickup={draft.pickup}
              />
            ) : null}
            {step === 3 ? (
              <CargoStep
                cargoDescription={draft.cargoDescription}
                errors={translatedErrors}
                fileError={fileError}
                onCargoChange={(cargoDescription) => setDraft({ ...draft, cargoDescription })}
                onFilesChange={handleFilesChange}
                onQuantityChange={(quantity) => setDraft({ ...draft, quantity })}
                onRemovePhoto={(id) =>
                  setPhotos((current) => current.filter((photo) => photo.id !== id))
                }
                photos={photos}
                quantity={draft.quantity}
              />
            ) : null}
            {step === 4 ? (
              <ContactStep
                contact={draft.contact}
                errors={translatedErrors}
                onChange={(contact) => setDraft({ ...draft, contact })}
              />
            ) : null}
            {step === 5 ? (
              <ReviewStep
                catalog={catalog}
                consentError={translatedErrors.consentAccepted}
                draft={draft}
                onConsentChange={(consentAccepted) => setDraft({ ...draft, consentAccepted })}
                onEdit={setStep}
                photos={photos}
              />
            ) : null}
          </div>

          <div
            className="pointer-events-none absolute -start-[10000px] top-auto size-px overflow-hidden"
            aria-hidden="true"
          >
            <label htmlFor="company-website">Company website</label>
            <input
              autoComplete="off"
              id="company-website"
              onChange={(event) => setDraft({ ...draft, honeypot: event.target.value })}
              tabIndex={-1}
              value={draft.honeypot}
            />
          </div>

          <div className="mt-9 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
            {step > 1 ? (
              <Button
                disabled={submitting}
                onClick={() => {
                  setErrors({});
                  setSubmissionError(undefined);
                  setStep((current) => Math.max(1, current - 1));
                }}
                type="button"
                variant="outline"
              >
                <BackIcon aria-hidden="true" className="size-4" />
                {t("back")}
              </Button>
            ) : (
              <span />
            )}
            <Button disabled={submitting} size="lg" type="submit">
              {submitting ? (
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
              ) : null}
              {step === TOTAL_STEPS ? (submitting ? t("submitting") : t("submit")) : t("next")}
              {!submitting && step < TOTAL_STEPS ? (
                <NextIcon aria-hidden="true" className="size-4" />
              ) : null}
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
