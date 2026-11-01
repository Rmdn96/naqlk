# Naqlk security and Google Ads remediation — November 1, 2026

Status: remediation verified and prepared for a local release commit on `fix/security-ads-remediation`; **not pushed or deployed**. Existing Next.js application retained. Google Ads reconsideration is **not ready yet**. No approval outcome is guaranteed.

## Evidence boundaries and production consistency

- The referenced November 1 audit was not present in the repository or supplied in this session. This report records independently reproduced findings; reconciliation with that audit remains outstanding.
- Initial working tree was clean. Source HEAD: `dd9692626fbee6b814f695a6911133747fc87d4f` (October 28, WhatsApp conversion fix). All listed changes below belong to this remediation.
- The original local `.next/BUILD_ID` was `1mQv_dJk8hm8hdIxI_iBu` with an October 16 timestamp. That is a local artifact, not production version evidence.
- Public production HTML on November 1 exposed build ID `SO1aygxXpqAAcB7XGZXaP`. Retrieved public assets included `layout-cf26e61825bbe844.js` and `8783-87dbf1667f1d4c57.js`. These do not disclose a reliable commit SHA. Exact deployed commit, Node version and build configuration require the Hostinger deployment record.
- Public headers identify `server: hcdn`, `platform: hostinger`, `panel: hpanel`. Previous deployment documentation predominantly described Vercel; it now distinguishes that historical setup from observed Hostinger production. No hosting settings were changed.
- Installed workspace packages were inconsistent with package.json/lockfile: Next 16.4.0 versus 16.4.3, React 19.3.0 versus 19.3.1, Vitest 5.0.4 versus 5.0.5, and others. This is confirmed local drift, not proof of production dependency versions.

## Findings and fixes

| Issue                    | Confirmed cause/evidence                                                                                                                                                                       | Local change and outstanding work                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sensitive browser drafts | The original hook serialized the entire draft, including contact data, detailed addresses, coordinates, cargo text, notes and consent, without expiry.                                         | v2 saves only service ID, city IDs, quantity and option IDs. Personal fields stay in memory. A timestamp expires stored selections after 24 hours; expired/malformed data and legacy v1 drafts are removed. Successful submission cancels pending writes and clears saved data. Storage failures no longer interrupt the form.                                        |
| Disclosure mismatch      | Existing notices did not explain browser draft data or its lifetime.                                                                                                                           | Arabic/English notices and form save messages now describe the limited persistence, refresh behavior, cleanup, external services and consent. Server records are explicitly separate from browser drafts.                                                                                                                                                             |
| www duplication          | A public GET to `https://www.naqlk.com/en/services/goods-transport?gclid=remediation-check&utm_source=diagnostic` returned 200, not an apex redirect. Next configuration had no host redirect. | Host-specific permanent 308 redirect to apex added before locale handling. Local runtime tests preserve paths, encoded queries, click identifiers and callback queries. Production remains unchanged until an approved release.                                                                                                                                       |
| Headers                  | Observed production only had enforced `Content-Security-Policy: upgrade-insecure-requests` among the reviewed browser-security headers. App configuration only protected quote/track routes.   | Global nosniff, SAMEORIGIN, conservative referrer and permissions headers added. Geolocation remains available on this origin. Candidate CSP is report-only; existing private-route protections remain.                                                                                                                                                               |
| Transparency             | The repository supplies a brand and contact numbers, but no independently verified legal operator identity or registration evidence. Phone choices were hidden behind a button.                | Existing phone numbers and any configured business phone are visible in the footer. Existing configured email/address/hours remain conditional. Both locales explain that a request does not confirm booking/final price. Legal identity/contact ownership and complete commercial disclosures still require business-owner evidence. No legal details were invented. |
| Dependencies             | npm audit flagged development-only `@hono/node-server` 2.0.12 for GHSA-rmxm-3fg6-px4f.                                                                                                         | Only that existing transitive lockfile entry updated to compatible 2.1.5. No new packages or major upgrades. Final production audit: zero findings. Full audit: 20 moderate and 2 low findings, no high/critical, in tooling chains associated with minimatch/deepmerge.                                                                                              |
| Ads account/actions      | Source and fetched production JS contain `AW-18518703197`, completed-request label `625xCKaL_58dEN34s_5E` and WhatsApp label `GRLaCKXv5KwdEN34s_5E`.                                           | Existing consent, event handling, IDs and conversion logic unchanged. Documentation now requires account/action verification before enablement. Presence in source/production does not verify ownership.                                                                                                                                                              |
| Phone measurement        | Source phone links use `tel:` with a close-picker handler, not an Ads conversion handler; no phone-action label was found.                                                                     | Phone navigation preserved. No conversion identifier invented or borrowed. Account-managed call measurement and intended phone action remain unverified.                                                                                                                                                                                                              |

Expiry is enforced when the updated site next executes, on focus and during periodic cleanup; a closed browser cannot run deletion. Legacy personal data on a browser that never revisits cannot be remotely erased. Refreshing the request form deliberately requires re-entering personal/free-text fields and selecting photos again. No server-side submission, pricing, upload or authorization contract was changed.

## Hostinger WAF/CDN investigation

Observed on November 1, 2026, approximately 15:32–15:36 UTC:

| Probe                                                           | Result                                                                    | Interpretation                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Ordinary GET `/ar`                                              | 200; hcdn request ID `d48b4a9b21b7675ed5e62f641d948c4b-int-edge8`         | This request reached the application.                                              |
| Same route with user agent `Googlebot`                          | Host-branded 403; request ID `a499cbc7606eb36c0b7511f5ab3b0b41-int-edge9` | CDN/server-layer denial of our spoofed crawler request. The exact rule is unknown. |
| `/en` with `AdsBot-Google (+http://www.google.com/adsbot.html)` | 200; request ID `8aab57f29e7d7f52b76ff2ba6b57678b-int-edge8`              | This spoofed AdsBot request was allowed. It is not a genuine Google fetch.         |
| `/robots.txt` and `/sitemap.xml`                                | 200; public localized routes allowed, private routes disallowed           | No blanket robots prohibition on the reviewed marketing routes.                    |

**Genuine crawler blocking is unconfirmed.** A user-agent string does not authenticate Google traffic. No Hostinger rule/access logs, verified Google source IPs, Search Console live-fetch result or Ads destination diagnostic were available. No WAF settings, bot exceptions or IP allowlists were changed.

Required manual actions:

1. Export relevant Hostinger access/WAF records: timestamp, path, actual edge-observed client IP, user agent, status, rule/action and request ID. Do not trust arbitrary client-supplied forwarded-IP headers.
2. Verify claimed Google IPs against the appropriate current Google crawler/fetcher ranges, or perform reverse DNS followed by forward DNS back to the original address. Googlebot, AdsBot and user-triggered fetchers must be checked against their appropriate identities/ranges.
3. Run Search Console Live URL Inspection for affected URLs and the Google Ads destination diagnostic separately. Correlate each with Hostinger logs. Search Console alone does not prove AdsBot accessibility.
4. Review Under Attack mode, geographic/IP blocking, rate limits and bot rules. If a verified crawler is denied, ask Hostinger to correct the specific false-positive rule. Keep general protections; do not allowlist a user agent or disable security globally.
5. After an approved deployment, confirm both domains reach the Node application, purge relevant stale CDN responses and repeat redirects, headers and genuine-fetch diagnostics.

References: [Google crawler verification](https://developers.google.com/search/docs/crawling-indexing/googlebot), [current crawler range locations](https://developers.google.com/search/blog/2026/03/crawler-ip-ranges), [Hostinger crawler/CDN guidance](https://www.hostinger.com/support/hostinger-cdn-search-engine-crawlers-and-seo/).

## Verification results

Verification used an isolated temporary copy at `/tmp/naqlk-remediation.AgNDkc`, installed with `npm ci --ignore-scripts` from the final lockfile. No production credentials or real requests/conversions were used. Node was 24.21.0; the documented deployment minimum remains Node 22.

| Check                                | Result and limits                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                           | Passed in workspace and clean copy. Production build also ran TypeScript successfully.                                                                                                                                                                                                                                                                                                            |
| Relevant/full tests                  | Clean run: 50 files / 308 tests passed. One suite could not load because the temporary copy initially omitted `.github`; copying that directory and rerunning the suite passed its 3 tests. Aggregate: 51 files / 311 tests passed, including 5 new draft lifecycle tests and existing Ads, consent, WhatsApp picker, wizard and privacy tests.                                                   |
| Original workspace full test attempt | 309 passed; 2 SEO child-process checks failed with sandbox EPERM. They passed in the clean run outside that restriction.                                                                                                                                                                                                                                                                          |
| Lint                                 | Clean-copy full lint and targeted workspace lint passed. Original workspace full lint hit EIO while scanning the pre-existing `node_modules.corrupt-fuse-install-20261012235509` directory; it was not deleted or changed.                                                                                                                                                                        |
| Formatting / whitespace              | Changed application files and implementation/deployment docs passed Prettier; `git diff --check` passed.                                                                                                                                                                                                                                                                                          |
| Production build                     | Clean Next.js 16.4.3 webpack build passed, including TypeScript, 66 generated static outputs and traces. Final local build ID: `LR4p2goFuB-g-n1vFDX3P`; runtime/browser checks used the preceding build `-ELIMCVfAg_nxS_WNJbNA`, before a wording-only expiry clarification. Earlier sandbox SWC/native-cache and workspace dependency failures were resolved for verification in the clean copy. |
| Redirect runtime                     | Seven www requests passed 308/path/query assertions: root, both locales, nested service with gclid/gbraid/wbraid/UTM, encoded query, robots and synthetic auth callback. Apex `/` retained its normal 307 locale redirect. Root Location may omit the equivalent trailing slash.                                                                                                                  |
| Header runtime                       | Arabic/English privacy, track and invalid quotation routes returned 200 with expected baseline/report-only headers. Private routes retained no-store, no-referrer and noindex. No enforcing app CSP added.                                                                                                                                                                                        |
| Browser smoke                        | Headless Firefox passed Arabic/English privacy rendering, footer phone visibility and legacy/expired-draft cleanup; no uncaught page errors. Report-only CSP generated eval warnings in bundled code matching Zod's dynamic-Function feature probe. No `unsafe-eval` exception was added. Keep observation mode and assess legitimate violations before enforcement.                              |
| Production dependencies              | `npm audit --omit=dev --json`: zero findings. Full final audit: 22 affected tooling packages (20 moderate, 2 low), zero high/critical; `@hono/node-server` finding removed. Standard unfiltered npm audit still exits nonzero because findings remain.                                                                                                                                            |
| Ads checks                           | Existing mocked tests passed for consent denial/grant/withdrawal, route gating, event privacy, request deduplication and WhatsApp click conversion. Public JS matches the existing account/action strings. Account ownership, conversion receipt, phone measurement and real-browser Google integration are not certified.                                                                        |

The local server needed synthetic Supabase environment values. Homepage checks without a reachable catalog produced an expected catalog-unavailable error; they are not evidence of production failure. Authenticated operations, OAuth, real Supabase requests/uploads and production tag delivery require an approved preview with valid nonproduction configuration. The CSP browser observation covered privacy pages, not all integrations.

## Remaining risks and release gates

- Verified legal operator identity, registration details where applicable, business address/contact email/number ownership and any relevant pricing/cancellation/refund terms remain unavailable. Existing configured contact values are not independently verified by this work.
- Server-record retention periods, deletion rights/processes and full legal-policy sufficiency require business/privacy-owner confirmation. The new draft TTL does not impose server retention.
- Remaining tooling advisories: minimatch GHSA-g3hv-75wg-m249 affects versions below 11.0.1, and deepmerge GHSA-gcqx-w48m-w2h4 affects the locked 4.x release. Do not apply npm's suggested disruptive downgrades or an untested cross-major override. Review compatible upstream fixes in a separate scoped tooling change; keep untrusted glob/merge inputs out of tooling. This is not a formal risk acceptance.
- Candidate CSP remains report-only and permits inline code for Next.js. It is not an enforced XSS mitigation. Investigate the observed eval probe and validate Google/Supabase/integration origins before enforcement.
- The exact production SHA, environment, build/runtime configuration, genuine crawler accessibility and Ads-account authorization remain unresolved.

Threat model: customer contact/location/free-text data is sensitive; browsers and localStorage are untrusted and readable by same-origin scripts or a person sharing the device. The new allowlist reduces persistent exposure but does not protect live page memory against XSS. Submission still crosses the existing validated server/Supabase boundary. Ads remains a separate, consent-gated third-party boundary. Hostinger is a separate edge trust boundary whose decisions require provider logs. Tests cover storage denial, malformed/expired data, cleanup and save races; rollback must never restore the old full-PII draft writer. Release and business owners must review residual risks before deployment.

## Modified files

- `.env.example`: require verification of existing Ads identifiers.
- `next.config.ts`: www redirect, baseline headers, candidate report-only CSP.
- `package-lock.json`: only the compatible @hono/node-server update.
- `src/config/public-request.ts`: draft storage version 2.
- `src/features/public-request/lib/draft-storage.ts`: allowlisted persistence and expiry validation.
- `src/features/public-request/hooks/use-request-draft.ts`: safe hydration/writes/cleanup and pending-save cancellation.
- `src/features/public-request/components/request-wizard.tsx`: accurate storage status.
- `src/components/shared/public-chrome.tsx`: legacy/expired-draft cleanup on visits/focus/timer.
- `src/components/shared/site-footer.tsx`: visible existing numbers and request disclosure.
- `src/app/[locale]/privacy/page.tsx`: browser draft section.
- `messages/ar.json`, `messages/en.json`: bilingual notices and disclosures.
- `tests/features/public-request/draft-storage.test.tsx`: privacy/lifecycle regression tests.
- `docs/implementation/04-Public-Request-Flow.md`: corrected persistence contract.
- `docs/deployment-guide.md`: actual-host distinction, verification and manual release instructions.
- `docs/security-ads-remediation-2026-11-01.md`: this evidence and handoff.

## Deployment and reconsideration

No deployment is authorized by this patch preparation. First obtain the missing business, Hostinger and Ads evidence and reconcile the original audit. Review/approve the exact diff, then separately authorize any commit/push/release. Follow the [deployment guide](deployment-guide.md): clean lockfile install, approved environment, checks/build, Node app release, release SHA/build-ID recording, CDN verification, integration smoke tests and rollback readiness. No database migration is needed.

After an approved deployment, recheck public URLs, canonical redirects, headers, privacy text, consent and verified crawler access at the Hostinger edge. Preserve diagnostic evidence for reconsideration. **The website is not yet ready for Google Ads policy reconsideration** because the identity/commercial evidence, crawler/account verification and production release validation remain outstanding. Technical fixes cannot guarantee policy approval.

## Release-blocker closure update

This section supersedes the earlier Vercel-oriented deployment guidance and earlier test limitations where specified. No commit, push, deployment, billing/WAF change or advertising enablement was performed.

Confirmed production evidence: a fresh public HTML check still exposes build ID `SO1aygxXpqAAcB7XGZXaP`. Public `/en/request` JavaScript identifies browser Supabase project `bxyplqllksnvqddsipzz`; no key values were printed. This does not authenticate the project's ownership or prove the server secret matches it. All required application environment variables are absent from the current local shell and no real local environment file exists; Hostinger's actual inventory remains unavailable.

The [Hostinger release guide](deployment-guide.md) now replaces the obsolete Vercel process, documents mandatory build/runtime variables (including the required server `SUPABASE_SECRET_KEY`), source packaging, backup and provider-specific rollback verification, exact approved release steps and CDN freshness checks. Node 22 is declared in `.nvmrc`; Node 24.21.0 was used for the clean build/tests. Actual Hostinger deployment method, source SHA, Node/npm, commands, artifact path and environment values require hPanel/owner evidence. Provider-supported layouts/actions are explicitly distinguished from confirmed Naqlk settings.

### New verification and packaging files

- `playwright.release.config.ts`: fixed localhost endpoints and synthetic environment, no reuse of an existing server, advertising disabled.
- `tests/fixtures/release-supabase.mjs`: in-memory HTTP simulator with no upstream client. Actual browser upload bytes/checksum/content type/size are checked before accepting the simulated submit RPC.
- `tests/fixtures/local-network-only.cjs`: server fetch egress guard loaded before Next/Supabase; nonlocal fetches are rejected even if a stale production build is accidentally used. Browser egress is separately restricted by the tests.
- `tests/release/request-flow.spec.ts`: Arabic/English real server-action submission with and without attachments, rejection/cleanup of incorrect upload metadata, page rendering, consent grant/withdrawal, WhatsApp and telephone link handlers. Calls/messages are prevented; no live conversions or database writes are sent.
- `vitest.config.ts`: exclude the new Playwright suite from Vitest, as with the existing browser suite.
- `scripts/release/prepare-source.mjs`: includes tracked/nonignored untracked source, requires the original three remediation files, rejects private paths, creates ZIP/manifest outside the repo and checks every archived file hash. This avoids omitting untracked imports. Git/ZIP child processes require execution outside the restricted sandbox in this environment.
- `.env.example`: corrected the server-secret requirement and removed the unverified old completed-request label from the operative default. Existing tag/WhatsApp constants in application code remain unchanged pending verified account 164-117-2837 data.

### Results from this closure pass

| Check                               | Result                                                                                                                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean production-mode build         | PASS, Next 16.4.3, TypeScript and 66 static outputs; localhost-only staging configuration, build ID `NUz-MLPXMQ-rHgUFLzqMs`. This is a test artifact, not deployable production configuration. |
| Full regression rerun               | PASS, 51 files / 311 tests in one run.                                                                                                                                                         |
| Staging browser integration         | PASS, 8 Firefox tests; both locales, real Next Server Actions and Supabase SDK against the local simulator, successful uploads/submissions and rejected-upload cleanup.                        |
| TypeScript and clean-copy full lint | PASS.                                                                                                                                                                                          |
| Security threshold                  | PASS, no high/critical; 22 existing tooling findings remain (20 moderate, 2 low). No force upgrades.                                                                                           |
| Source parity                       | Application `src` and message directories match the tested clean copy. CSP remains report-only; WAF/security settings unchanged.                                                               |

The final production-only dependency audit also passed with zero findings (`npm audit --omit=dev --json`).

These tests close the earlier lack of a full browser submission/upload exercise at the application/HTTP boundary. They do **not** certify actual Supabase SQL/RLS/storage permissions, separate-project staging, production key pairing, Hostinger runtime/CDN behavior, OAuth or real Google conversion delivery. No staging project credentials were supplied.

### Remaining release decision

**NO-GO for deployment until owner-only operational gates are closed; local remediation and integration verification are ready.** Required owner actions: identify the existing Hostinger service/source/runtime/artifact, privately validate the production project/key inventory, save and verify a durable backup plus selectable privacy-preserving recovery artifact, confirm the intended runtime in staging, and authorize the exact release operations. A separate real Supabase staging project is still needed to validate database/storage policies without production test requests.

Business information remains missing: legal operator and brand relationship; registration/licensing where applicable; verified address/email/contact-number ownership/hours; service/quotation/pricing/cancellation/refund disclosures; server retention/deletion process and privacy contact. These remain compliance/Ads gates and are not assumed facts.

For Ads customer account `164-117-2837`, obtain the verified conversion-owning account, Google tag ID and distinct completed-request/WhatsApp/phone action requirements. The customer ID must not be converted into an invented AW ID. Exact source/test/deployment locations are mapped in the release guide. Keep tracking/testing false and the request label blank until a separately approved update/rebuild; current phone links have no conversion handler. Neither the old tag nor old labels establish authorization for the new account.

The source ZIP/manifest is generated locally after final documentation changes. Its exact path/checksum is reported at handoff; preserve it outside temporary storage before release. No source ZIP replaces a backup of the currently deployed artifact, its environment or server data.

## Node 22 local release preparation

The owner subsequently confirmed Hostinger GitHub auto-deployment and production Node 22 and authorized a local branch/commit only. Branch `fix/security-ads-remediation` was created without changing main. Local and remote main were checked as `dd9692626fbee6b814f695a6911133747fc87d4f`. Official Node 22.23.4 was installed under `/tmp` and verified by checksum; 311 regression tests, 8 browser integration tests, production build, lint, TypeScript and the remaining validation checks passed. The [release record](releases/security-ads-remediation.md) documents exact evidence, guarded promotion commands and rollback. No push/merge/deployment or production setting/Ads change was performed. Owner-only deployment/environment/backup and real Supabase staging gates remain; Node-major and deployment-source-method questions are now resolved by owner evidence.
