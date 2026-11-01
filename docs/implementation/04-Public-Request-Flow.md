# Naqlk Public Request Flow

| Document field | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| Sprint         | 3 — Public Request Flow                                                |
| Status         | Implemented                                                            |
| Version        | 1.0.1                                                                  |
| Effective date | 2026-08-03                                                             |
| Scope          | Guest-facing request vertical slice; no pricing, quotation, or payment |

## 1. Purpose

Sprint 3 delivers the first complete customer-facing Naqlk journey. A guest can discover the service, complete a five-step Arabic-first request, add map-ready route coordinates and optional cargo photos, submit once, receive a Lead reference, and continue through WhatsApp. English has route and content parity.

## 2. Public routes

| Route                         | Purpose                                                       | Search policy |
| ----------------------------- | ------------------------------------------------------------- | ------------- |
| `/{locale}`                   | Server-rendered homepage and live service catalog.            | Indexable     |
| `/{locale}/request`           | Five-step guest request wizard.                               | Indexable     |
| `/{locale}/request/success`   | Confirmation and reference display after authoritative write. | No index      |
| `/{locale}/privacy`           | Versioned factual notice for request data and attachments.    | Indexable     |
| `/robots.txt`, `/sitemap.xml` | Localized crawl contract.                                     | Public        |

The active locales are `ar` and `en`; Arabic is the default and always uses RTL at the document boundary. Locale URLs are explicit and provide canonical and alternate-language metadata.

## 3. Wizard contract

1. **Service:** one active Service plus eligible global or service-specific options.
2. **Pickup and delivery:** one active City and a detailed address for each endpoint; optional browser geolocation stores paired latitude/longitude values.
3. **Cargo:** required description, optional whole-number quantity, and zero to four optional images.
4. **Contact:** name, normalized Saudi mobile, optional email, and optional notes.
5. **Review:** complete summary and explicit acceptance of privacy notice `public-request-v1`.

As of November 1, 2026, only service, city IDs, quantity and selected options are saved to `localStorage` under a v2 key, expiring 24 hours after the most recent save. Opening or editing the request form saves selections again. Personal/free-text fields, exact addresses, coordinates, consent, submission IDs and file bytes remain in page memory. Refresh requires re-entering those fields and reselecting photos. Legacy v1 drafts are deleted on the next updated-site visit. Expired progress is cleaned on visits, window focus and every minute while the public chrome is mounted. Successful submission cancels pending saves and clears progress; blocked browser storage does not interrupt submission.

## 4. Server Actions

| Action                        | Responsibility                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `preparePublicRequestAction`  | Revalidate the complete payload and file descriptors, resolve idempotency, and mint scoped uploads. |
| `completePublicRequestAction` | Verify private Storage objects and invoke the transactional database boundary.                      |
| `cancelPreparedUploadsAction` | Remove successfully prepared objects after a recoverable client/upload failure.                     |

Next.js Server Actions provide the trusted application boundary. The browser never receives the Supabase secret key and never receives a broad Storage permission.

The migration also removes the earlier anonymous direct-insert grants and RLS policies for `addresses` and `leads`. Public writes therefore have one validated, rate-limitable application boundary instead of a second REST path that could bypass the wizard contract.

## 5. Validation and abuse controls

Zod validates the same complete submission contract on the client and server. PostgreSQL constraints and triggers remain authoritative. Validation includes:

- active UUID catalog identities;
- Saudi mobile normalization to `+9665XXXXXXXX`;
- paired coordinate ranges;
- distinct pickup and delivery;
- length and quantity bounds;
- four-image maximum;
- JPEG, PNG, and WebP only;
- 8 MiB per image and 24 MiB aggregate;
- unique opaque submission identifier;
- required privacy consent;
- an invisible honeypot; and
- a bounded minimum/maximum completion-time signal.

Server Actions are same-origin protected by Next.js. Idempotency prevents ordinary double submission. Platform edge rate controls and stronger bot scoring remain an operational enhancement if launch traffic or abuse requires them.

## 6. Private upload sequence

1. The server creates a two-hour signed upload token scoped to `attachments/guest/{submissionId}/{fileId}.{extension}`.
2. The browser uploads directly to Supabase Storage, avoiding Vercel request-body limits.
3. The browser calculates a SHA-256 integrity value.
4. The completion action verifies each object through the secret server client, including bucket, path ownership, size, and content type.
5. Metadata is recorded with `pending` inspection status; file bytes remain private in Storage.
6. Failed requests remove prepared objects when the request is still connected. Disconnected orphan cleanup remains a future scheduled operation.

No anonymous Storage policy is added. Object paths and filenames are not treated as authorization.

## 7. Database write

Migration `20260803170000_public_request_flow.sql` adds cargo, idempotency, and immutable privacy-consent fields to `leads`. The service-role-only `submit_guest_service_request` function creates:

- pickup Address;
- delivery Address;
- one guest Lead; and
- zero to four `lead_attachments` metadata records.

All records are committed in one PostgreSQL transaction. Migration `20260803171000_standardize_lead_references.sql` makes every public Lead reference `NQ-YYYYMM-000001`, using an atomic, row-locked monthly counter keyed to the Asia/Riyadh calendar month. The retained `uq_leads__reference_number` unique constraint supplies the public-reference index; the internal UUID remains the primary key. Existing Leads are deterministically resequenced by submission time within their month during the forward-only migration. The submission key returns the existing reference on a safe retry.

The rollback is `supabase/rollbacks/20260803170000_public_request_flow.rollback.sql`. It removes the trusted function, provenance guard, index, constraints, and new Lead columns, then restores the former anonymous insert policies and grants. Production rollback is destructive to Sprint 3 cargo/consent provenance and therefore requires a backup and approved change window.

Migration `20260803170500_public_request_repair_arabic_catalog.sql` corrects mojibake discovered in the inherited Sprint 2A Arabic reference values during deployed browser verification. It updates only Arabic display fields through stable City, Service, and Service Option keys and fails atomically if any catalog name retains the known corruption markers. This data-quality correction is intentionally forward-only: reverting to corrupted customer-facing text is not an acceptable rollback state.

Production migration drift discovered on 2026-08-04 is reconciled by `20260804113000_reconcile_lead_reference_generation.sql`. The full incident record, active allocator contract, live verification evidence, cleanup, and prevention controls are documented in [Production Lead Reference Reconciliation](06-Production-Lead-Reference-Reconciliation.md). Applied migrations are immutable; the corrective migration supersedes the defective allocator without rewriting its history.

Business contact values remain environment-backed during MVP. The approved future source of truth is documented in [Business Settings Management](../backlog/01-Business-Settings-Management.md); runtime code must prefer its published values when that capability is implemented and use environment variables only as fallback.

## 8. Security and privacy

- `SUPABASE_SECRET_KEY` is required only in the server runtime.
- Success URLs contain the non-secret Lead reference only; mobile, address, and attachment data never enter URLs.
- The success route is non-indexable and non-cacheable.
- Attachments stay private and are never rendered before a future inspection/download authorization flow.
- Logs and returned errors expose stable outcome classes, not customer details or provider payloads.
- Direct anonymous business-record reads remain denied by RLS.
- Direct anonymous Address and Lead writes are denied; the server-validated submission boundary is the only public write path.

## 9. Accessibility, performance, and SEO

- semantic headings, landmarks, fieldsets, labels, error associations, error focus, live save status, and native controls;
- keyboard-operable five-step journey and at least 44-pixel controls;
- mobile-first layouts without page-level horizontal scrolling;
- direction-aware icons, logical spacing, and bidirectional isolation for mobile/reference values;
- reduced-motion override;
- server-rendered homepage/service content with localized metadata, canonical URLs, alternates, robots, and sitemap; and
- direct-to-Storage uploads that keep large binary bodies away from the application server.

## 10. Environment

| Variable                               | Visibility  | Requirement                                                                                                        |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public      | Existing Supabase project URL.                                                                                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public      | Existing publishable client key.                                                                                   |
| `SUPABASE_SECRET_KEY`                  | Server only | Required for signed uploads, verification, cleanup, and trusted RPC.                                               |
| `NEXT_PUBLIC_APP_URL`                  | Public      | Active application/callback origin; `https://naqlk.vercel.app` in Vercel Production and Preview during pre-launch. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`          | Public      | Required deployment fallback `966547349947`; Business Settings will supersede it when implemented.                 |

## 11. Deferred scope

- pricing and quotation UI;
- customer account linking;
- Order tracking portal and tracking abuse controls;
- notifications and automatic WhatsApp sending;
- malware/content scanning and scheduled orphan cleanup;
- Google Maps place search, route eligibility, and distance calculation;
- Admin, Order, payment, and pricing interfaces; and
- analytics beyond privacy-safe platform telemetry.
