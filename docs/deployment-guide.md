# Hostinger release guide

This runbook does not authorize a commit, push, deployment, billing change, advertising enablement or WAF change. Preserve the existing Next.js application and hosting method. See [remediation evidence](security-ads-remediation-2026-11-01.md).

## Confirmed configuration and missing evidence

| Item                | Confirmed locally/publicly                                                                                       | Required Hostinger evidence                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Framework           | Next.js 16.4.3, server application                                                                               | Next.js backend preset and domain-to-app mapping                                                  |
| Source              | HEAD `dd9692626fbee6b814f695a6911133747fc87d4f` plus reviewed uncommitted files                                  | Actual GitHub branch/SHA, uploaded ZIP identity or other source                                   |
| Runtime             | `.nvmrc`: 22; package engines >=22; verification used Node 24.21.0                                               | Current Node/npm version; match the intended supported major in staging                           |
| Commands            | Install `npm ci --include=dev`; build `npm run build` (`next build --webpack`); start `npm start` (`next start`) | Configured commands, application root and provider PORT                                           |
| Production artifact | Public build ID `SO1aygxXpqAAcB7XGZXaP` observed November 1                                                      | Deployment/version ID, exact source SHA, artifact path, `.next/BUILD_ID` and environment snapshot |

The owner has confirmed GitHub integration with automatic deployment enabled and production Node.js 22. No Hostinger connector, deployment record or real local environment file is available here. The monitored branch, exact Node 22 patch/npm versions, configured commands, current deployed SHA and key inventory still require hPanel evidence. Treat a push to the monitored branch as a production deployment action; do not push merely to run CI.

For this release, use the existing GitHub integration. ZIP preparation is a source-integrity/backup option, not authorization to switch deployment methods. The [local release/promotion record](releases/security-ads-remediation.md) contains guarded promotion and source-rollback commands. Local commit preparation is authorized by the latest owner request; promotion/deployment still require separate approval.

The publicly served `/en/request` JavaScript embeds Supabase project reference `bxyplqllksnvqddsipzz`. This confirms the browser's configured project URL, not dashboard ownership, matching server-secret configuration or database health. The production build ID was rechecked and remains the value above. No key values were printed.

Hostinger documents managed artifacts under the domain's `hbuilds/current/nodejs`, with version folders and a `current` symlink; legacy layouts also exist. These are provider examples, not verified Naqlk paths. Inspect the actual deployment record/File Manager/SSH paths. Do not delete old directories or change symlinks during investigation.

## Environment contract

All mandatory values are absent from the current local shell; `.env.local` is absent. Hostinger presence is unknown. There are no new mandatory application variables introduced by this remediation. Do not paste secrets into chat/logs, export them in public screenshots, or include them in source archives.

| Variable                                                                    | Phase and requirement                                                                                                                                                               |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                                                       | Build/runtime: `https://naqlk.com` in production. Also used for auth callbacks.                                                                                                     |
| `NEXT_PUBLIC_SUPABASE_URL`                                                  | Build/runtime: intended Supabase project URL. Staging must use another project or localhost simulator.                                                                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                                      | Build/runtime: public key belonging to that same project.                                                                                                                           |
| `SUPABASE_SECRET_KEY`                                                       | Required encrypted server runtime secret for guest request lookup/submission, signed uploads and verification. Also used by operator tooling. Never expose through `NEXT_PUBLIC_*`. |
| `NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED`                                   | Explicit build-time `false` until verified account 164-117-2837 configuration and separate enablement approval.                                                                     |
| `NEXT_PUBLIC_GOOGLE_ADS_TESTING`                                            | Explicit build-time `false` in production.                                                                                                                                          |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL`                                   | Optional while tracking is disabled. Blank/remove the old deployment value until the new completed-request action is verified.                                                      |
| `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED`, `NEXT_PUBLIC_AUTH_APPLE_ENABLED`         | Preserve approved build-time provider settings and callback allowlists.                                                                                                             |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_GOOGLE_REVIEW_URL`              | Optional public fallbacks. Preserve verified values; the number picker uses `src/config/contact.ts`, not this WhatsApp fallback.                                                    |
| `NAQLK_DEFAULT_QUOTATION_VAT_RATE`, `NAQLK_DEFAULT_QUOTATION_VALIDITY_DAYS` | Preserve approved runtime values. Code defaults 0.15 and 7 are not verification of business terms.                                                                                  |
| `NAQLK_AUTH_PREVIEW_ORIGIN`                                                 | Empty in production. This override alone does not turn a Hostinger production process into a Vercel preview; validate the origin-approval code before remote staging OAuth.         |
| `NAQLK_AUTH_LOCAL_ORIGIN`                                                   | Optional approved local callback origin. Local simulator tests do not cover OAuth.                                                                                                  |
| `NODE_ENV`, `PORT`                                                          | Provider runtime production mode/assigned port. Do not copy local test ports into hPanel.                                                                                           |
| `SUPABASE_DB_URL`                                                           | CI/operator migration-drift check only; not required by the web runtime.                                                                                                            |

`NEXT_PUBLIC_DEFAULT_LOCALE` and `NEXT_PUBLIC_SUPPORTED_LOCALES` in the example are not read by current application code; locales come from `src/i18n/routing.ts`.

Match the URL project reference with Supabase Dashboard → settings/Connect, both keys with the same project, and existing RPCs/migrations/private attachments storage. An opaque secret cannot prove project membership by its format. Do not expose key values or query privileged production records to establish this. Use an approved separate staging project for the final real-provider integration check.

Public variables are embedded at build time: restart alone cannot switch browser project/origin/Ads configuration. Rebuild with target values; runtime-only secret changes require restarting the existing service. Never use `.env.example` placeholders in production.

## Safe local staging tests

`playwright.release.config.ts` is fixed to localhost and cannot fall back to the historical production E2E URL. It launches an in-memory Supabase HTTP simulator with no upstream client. Browser external requests are blocked. Tests exercise real Next.js Server Actions, SDK HTTP requests, multipart uploads, checksums/metadata, validation and success navigation. They do not certify Supabase SQL/RLS/storage policies, Hostinger TLS/WAF or OAuth.

Run from a clean source copy with the matching Playwright Firefox installed:

```sh
npm ci --include=dev
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3107 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_release_fixture NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED=false NEXT_PUBLIC_GOOGLE_ADS_TESTING=false npm run build
npx playwright test --config playwright.release.config.ts
```

The config supplies a synthetic server key only to its local server. This artifact must never be uploaded: rebuild with approved release settings. No test request may target the production database. A real staging project remains preferable when supplied by the owner.

## Source inventory and packaging

`node scripts/release/prepare-source.mjs` creates a source ZIP and external JSON manifest in a fresh `/tmp/naqlk-release-source-*` directory. It includes tracked and nonignored untracked files, requires the original three remediation files, rejects private/environment/build paths, and verifies every archived file's SHA-256. Sorted membership, 0644 file modes, fixed timestamps and UTC ZIP metadata make the archive repeatable on the same zip implementation. The manifest records HEAD and whether uncommitted changes exist. Next.js build IDs are generated and build-time environment dependent; byte-identical Next.js build output is not claimed. The script does not commit, push or deploy. Keep the approved ZIP/manifest in durable private release storage; `/tmp` is not a backup. Regenerate after any change.

The original three files are `docs/security-ads-remediation-2026-11-01.md`, `src/features/public-request/lib/draft-storage.ts` and `tests/features/public-request/draft-storage.test.tsx`. Include the release fixture/tests/config, packaging script and all other changes too. GitHub cannot deploy uncommitted files; ZIP release must select the new ZIP, not remembered previous files.

## Hostinger backup and rollback preparation

1. Open the existing site's Deployments/Settings with owner access. Record source method, repository/branch/SHA or ZIP, deployment ID, `.next/BUILD_ID`, app root, runtime and install/build/start commands. Determine whether pushes auto-deploy; do not push without release approval.
2. Back up current deployable source/lockfile and running artifact/static assets/dependencies as appropriate for the actual service to private durable storage. Record checksums. Separately export encrypted environment and domain/DNS/TLS/CDN/header settings. Never put secret backups in the source ZIP. Managed hosting may retain only two successful versions; do not depend on provider retention alone.
3. Verify with Hostinger controls/support how to restore a specific artifact. GitHub Redeploy selects latest branch content, not an earlier commit. A saved ZIP may have been replaced. Demonstrate recovery-source selection on staging before release; do not invent a restore button or manually change symlinks.
4. Prepare/test a recovery artifact that retains draft privacy and remains compatible with server data. The previous application restores indefinite personal-data persistence and is not automatically a safe rollback. No tested recovery candidate means rollback readiness is blocked.
5. Confirm existing Supabase backup health/access separately. There is no database migration in this release. Do not restore a database snapshot over new requests/uploads during an application rollback.

## Exact release sequence after approval

1. Obtain missing Hostinger/runtime/project evidence, confirm recovery access and staging results, and review the source manifest. Missing business identity/Ads ownership blocks compliance/Ads enablement; it need not delay an otherwise safe approved privacy fix.
2. Obtain explicit approval for the exact commit/push/upload/deploy operations. Preserve deployment method; do not create a new billable service or change hosting plans.
3. Managed Node: open the existing site's Settings & Redeploy or Deployments → Redeploy. Select approved GitHub content or Upload new files for ZIP. A VPS/custom deployment requires its verified process-manager/release-directory runbook instead; do not assume hPanel Node controls apply.
4. Confirm backend Next.js preset, repository root, Node major matched in staging, deterministic install `npm ci --include=dev`, build `npm run build`, start `npm start`, and provider PORT/proxy settings. If install settings are not editable, check build logs for lockfile use. Do not use static export or copy `.next` into `public_html`.
5. Configure approved project/key pairs and operational defaults at the correct build/runtime phases. Set Ads tracking/testing false. Verify apex HTTPS and Supabase callback allowlists. www-only sessions may require sign-in on apex; do not broaden cookie/auth trust to avoid that.
6. Run TypeScript, regression tests, lint, security check and production build for the exact source/environment. Preserve documented development-only advisory findings; no forced upgrades. Verify submission/uploads in separate staging when available. Do not create production test leads/conversions.
7. Only after deployment approval, push the approved source to Hostinger's confirmed monitored GitHub branch. That push triggers automatic deployment; do not also click Redeploy unless a verified recovery/retry procedure requires it. Record resulting deployment ID, immutable source SHA, runtime and `.next/BUILD_ID`. Require successful build and running server.
8. Run the post-deployment checklist. Monitor server errors and request failures; use the prepared recovery on critical failures.

## Post-deployment and CDN checklist

- GET apex `/`, `/ar`, `/en`, both privacy pages and representative service/request pages. Verify catalog, locale/direction, Next.js assets and page rendering. No production submission test.
- GET www root/localized/nested routes with encoded queries: 308 → HTTPS apex, final 200, no loops; preserve gclid/gbraid/wbraid/UTMs. Both domains require valid TLS and correct Node mapping. Origin-only tests do not establish edge behavior.
- Check nosniff, SAMEORIGIN, referrer/permissions headers and report-only CSP. Keep existing host enforced-upgrade policy separate. Private quote/track routes retain no-store/no-referrer/noindex. Do not enforce CSP or add unsafe-eval to suppress observed warnings.
- Verify bilingual notices, old-draft cleanup, nonpersonal v2 storage and separate consent storage without submitting. Verify WhatsApp destinations and tel links without placing test calls/messages.
- With Ads disabled, consent grant/reject/withdrawal must work and no Google tag/conversion may load. For a later approved verified Ads release, test consent gating, destinations, deduplication and absence of personal fields using mocked transport first. Tag Assistant alone is not a guarantee against live conversion transmission.
- Compare public build ID/asset names and checksums with the approved artifact using fresh GETs and a clean browser. Capture x-hcdn-request-id, x-hcdn-cache-status, Age/Cache-Control when present. Repeat identical URLs to inspect normal caching: cache-busting alone does not prove normal clients see fresh responses. DYNAMIC is valid for dynamic pages; HIT is not required everywhere.
- If stale, confirm the new Node process is running, then use Performance → CDN → Manage to purge relevant cached pages/redirects/assets as part of the approved release. If only full purge is offered, record that scope. Verify both apex/www afterward. Browser caches and stale processes are separate causes; retain previous immutable assets as needed by older open pages.
- Verify actual Googlebot and AdsBot source IPs against crawler-specific Google ranges or reverse-plus-forward DNS. Correlate Search Console inspection/Ads diagnostics with actual logs/status/rule/request ID. Inspection traffic does not automatically establish AdsBot access. Ask Hostinger to correct evidenced false positives only; do not weaken WAF for spoofed crawler requests.
- Preserve evidence. Do not request Ads reconsideration until identity/commercial disclosures, genuine crawler access and account/action settings are verified.

## Executing rollback

Use the preverified Hostinger restore procedure for the selected recovery artifact, restore compatible encrypted environment/runtime settings, restart through the existing service and verify domain mapping/build ID. If managed controls cannot select the artifact, contact Hostinger with recorded version IDs or upload the approved recovery ZIP using the already-tested method. GitHub Redeploy is not an older-commit restore. No billing change, arbitrary symlink edit or database restoration is implied.

Purge stale HTML/redirects after recovery, then verify headers/assets, both locales, contact links, consent and draft privacy. Keep advertising disabled. If emergency recovery would restore the old personal-data writer, explicitly escalate that privacy tradeoff to the owner rather than silently accepting it. Record the incident/recovery artifact.

## Google Ads account 164-117-2837

The customer ID is not a tag/conversion ID. Obtain owner evidence for the conversion-owning account (including an authorized manager-account arrangement), tag ID and each action's tag setup. Do not derive AW-* from the customer ID.

| Location                                                                                                       | Required verified change before enablement                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/analytics/google-ads.ts`: `GOOGLE_ADS_TAG_ID`                                                         | Existing AW-18518703197 → verified tag ID. `google-ads-tag.tsx` imports this constant for script/config; no separate ID should be introduced. |
| Same file: `GOOGLE_ADS_WHATSAPP_CONVERSION_LABEL`                                                              | Existing GRLaCKXv5KwdEN34s_5E → verified WhatsApp-click action label.                                                                         |
| Hostinger build env and `.env.example`: `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL`                              | Existing 625xCKaL_58dEN34s_5E → verified completed-request label; blank while disabled for the new account.                                   |
| `tests/lib/analytics/google-ads.test.ts`, `tests/components/google-ads-consent.test.tsx`, contact-picker tests | Review identifier expectations/fixtures with the verified configuration; retain consent/deduplication assertions.                             |
| Deployment/remediation docs                                                                                    | Preserve old values as historical evidence; update operative examples only when approved.                                                     |

Confirm action category, counting, value/currency, primary/secondary/bidding inclusion and attribution with the Ads owner. Verify the website data source and any account-level call measurement. Current phone links have no conversion handler; do not borrow another action's label or equate a dial click with a completed call. New identifier changes and advertising enablement require a separately approved patch/rebuild. Consent functionality stays intact.

Provider references: [setup/artifact layout](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), [redeployment source behavior](https://www.hostinger.com/support/how-to-redeploy-a-node-js-application/), [environment phases](https://www.hostinger.com/support/how-to-edit-or-add-environment-variables-after-deployment/), [cache troubleshooting](https://www.hostinger.com/support/how-to-fix-changes-not-showing-after-a-node-js-deployment-at-hostinger/). These describe supported provider behavior, not proof of this site's settings.
