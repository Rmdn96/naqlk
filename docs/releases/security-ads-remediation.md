# Security/Ads remediation: local commit and promotion record

## Confirmed release inputs

- Release branch: `fix/security-ads-remediation`.
- Pre-release local `main` and live GitHub `refs/heads/main` both resolved to `dd9692626fbee6b814f695a6911133747fc87d4f` during preparation. Remote was read with `git ls-remote`; no remote branch was updated.
- Owner confirms Hostinger GitHub integration, automatic deployment and production Node.js 22. The monitored branch, actual deployed commit and exact runtime patch still require Hostinger evidence. Public Next.js build ID `SO1aygxXpqAAcB7XGZXaP` does not prove the deployed Git SHA.
- A local commit is authorized; push, merge, deployment, production configuration and advertising changes are not authorized.
- Required application environment and remaining provider/Supabase gates are listed in the [Hostinger runbook](../deployment-guide.md). Ads must remain disabled pending verified identifiers for customer account 164-117-2837.

## Verification and reproducibility

Use official Node.js 22, a fresh source checkout and `npm ci --include=dev` from the committed lockfile. Do not use the pre-existing workspace's mismatched/corrupt node_modules or copy `.next` from another environment. Build-time public variables must match the target runtime project/origin; never upload the local simulator build.

The local release test uses Node.js 22.23.4 (official linux-x64 archive SHA-256 `1805bcd35e6815559bd2eb97db438d3fdb0eb3a5e6a977b7c1badca76337e9ce`). It is a Node 22 compatibility check, not evidence of Hostinger's exact patch. Use these commands on a clean source copy under Node 22:

```sh
node --version
npm ci --include=dev
npm run validate
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3107 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_release_fixture NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED=false NEXT_PUBLIC_GOOGLE_ADS_TESTING=false NEXT_TELEMETRY_DISABLED=1 npm run build
npx playwright test --config playwright.release.config.ts
```

The browser suite runs real application/server actions and attachment HTTP flows against the local in-memory simulator. Both server fetch and browser egress guards prevent contact with production. Real Supabase SQL/RLS/storage policy and OAuth still need a distinct staging project. Use mocked transport for any later Ads verification; do not send fake production conversions.

After committing, `git status --porcelain` must be empty, and `git show --stat HEAD` must contain the full reviewed release. The original three new remediation files must be tracked, along with all release fixtures/configuration/tooling/docs. `.env.example` is an intentionally tracked public template with blank secrets; no real environment file, credentials, local runtime, node_modules, `.next`, ZIP, trace, log or temporary artifact belongs in the commit.

`node scripts/release/prepare-source.mjs` can produce a source ZIP/manifest from the clean commit. Two runs on the same source/zip implementation must have identical archive hashes, all member hashes verified, the same source HEAD and `containsUncommittedChanges: false`. Next.js build IDs/timestamps are not byte-for-byte reproducibility claims. Preserve release archives and the actual Hostinger artifact/environment backup in private durable storage.

## Recorded Node 22 verification

- Fresh lockfile installation: Node 22.23.4 / npm 10.9.9, `npm ci --include=dev --ignore-scripts`; package-lock unchanged. The isolated copy does not run Git hooks during dependency installation.
- Regression suite: 51 files / 311 tests passed in one run.
- Production-mode Next.js 16.4.3 webpack build: passed, TypeScript plus 66 static outputs; test build ID `rQbpgreigzmHPBRmT07pK`. Its public environment targets only localhost and is not deployable production configuration.
- Firefox integration: 8 passed under Node 22, both locales, request submission/attachments and rejected-upload cleanup, contact links and consent; no production data or conversions.
- Formatting, full lint, TypeScript, editorial validation, internal links, brand scan and high-severity security threshold: passed. Brand scan initially needed Git metadata in the temporary source copy and passed after that setup correction. The initial `validate` chain therefore stopped before its last stages; all remaining checks were completed separately.
- Existing dependency audit residual: 20 moderate / 2 low development-tool findings; no high/critical. No force upgrades or additional application dependencies.
- Application source/messages, next.config and lockfile were compared with the tested copy. Later edits only update release evidence/tooling documentation.

No real Supabase staging credentials or Hostinger settings were used. Provider configuration, production key pairing and selectable recovery still require owner verification. Only the sanitized `.env.example` template is intended for Git; fixture keys are synthetic and real environment/credential files are excluded.

## Promotion commands: instructions only

Do not execute until deployment approval, Hostinger environment/backup checks and branch protection requirements are satisfied. Because automatic deployment is enabled, the final push is a production deployment action, not just source publication. Confirm Hostinger's monitored branch before any branch push as well.

For a direct fast-forward promotion where branch protection permits it, substitute the approved release commit from the handoff for `APPROVED_RELEASE_COMMIT`:

```sh
set -e
git fetch origin
test -z "$(git status --porcelain)"
test "$(git rev-parse origin/main)" = dd9692626fbee6b814f695a6911133747fc87d4f
test "$(git rev-parse fix/security-ads-remediation)" = APPROVED_RELEASE_COMMIT
git switch main
git merge --ff-only origin/main
git merge --ff-only fix/security-ads-remediation
test "$(git rev-parse HEAD)" = APPROVED_RELEASE_COMMIT
git push origin main:main
```

Run as a stop-on-error sequence, stopping on any failed guard. If remote main changed, stop and review/retest against it. Do not force-push or overwrite its commits. If protection requires a PR, use the repository's approved PR/CI process; do not bypass protection. Confirm that publishing the feature branch will not trigger an unintended Hostinger deployment before doing so.

After the approved push, verify Hostinger built the exact SHA with Node 22 and the correct build/runtime environment, and run the full CDN/post-deployment checklist from the runbook. Do not merge/push merely to discover whether production has the necessary secret variables.

## Restoring a failed production release

Before promotion, record the last successful Hostinger deployment/version ID, actual deployed Git SHA, Node/npm, domain mapping and encrypted environment snapshot; save a deployable artifact/source backup with checksums. Confirm the provider's supported action for selecting that artifact and restarting it. GitHub Redeploy normally uses current branch content; it does not select a previous Git version by itself.

Preferred recovery: with explicit operational approval, restore the recorded last successful artifact through the already-verified Hostinger controls/support procedure, restore compatible environment settings, restart and verify the restored version. Purge stale CDN HTML/redirects as appropriate, verify both domains/locales/assets/headers/contact/consent and monitor server errors. No database schema change is part of this release; do not restore Supabase over new customer leads/uploads.

If artifact restoration is unavailable and the release was exactly one fast-forward commit, the following source rollback can be reviewed and approved. It restores pre-release main source, which is the previous production source **only if Hostinger records confirm that mapping**:

```sh
set -e
git fetch origin
test -z "$(git status --porcelain)"
git switch -c rollback/security-ads-remediation origin/main
test "$(git rev-parse HEAD)" = APPROVED_RELEASE_COMMIT
git revert --no-edit APPROVED_RELEASE_COMMIT
# Run Node 22 checks/build and review the recovery diff before authorizing the push.
git push origin HEAD:main
```

These are instructions, not actions performed during preparation. Stop if main has advanced, protection requires a PR or the previous deployment used different source/settings. Never use a destructive reset/force-push to restore main.

A full revert restores the former indefinite personal-data draft writer and removes the new protections. Prefer a separately tested recovery retaining draft privacy where feasible; an emergency full restore requires the owner's explicit privacy-risk decision. Do not silently call the old artifact privacy-safe. Keep Ads disabled in the recovery build; a runtime-only flag change does not alter an already embedded public tracking flag.

## Remaining gates

Hostinger: confirm main is the monitored branch, current deployed SHA/artifact, exact Node 22 patch/npm, app root/commands, production build/runtime variables, encrypted backup and tested artifact recovery. Supabase: confirm project `bxyplqllksnvqddsipzz` against owner dashboard evidence, matching publishable/server-secret keys, required RPCs/private attachments bucket, and a separate staging integration check. Business identity, commercial/privacy terms, genuine crawler evidence and verified new-account conversion actions remain Ads/compliance gates. No Ads identifier is derived from customer ID 164-117-2837.
