# Deployment Guide

## Environments

- Local: developer machine with `.env.local`.
- Preview: an isolated Vercel deployment for each pull request or branch.
- Production: the protected `main` branch and production-only environment values.

Do not reuse production credentials in local or preview environments.

## GitHub and Vercel setup

1. Create the GitHub repository and push the `main` branch.
2. Import that repository into Vercel.
3. Confirm the framework preset is Next.js and the root directory is the repository root.
4. Use `npm ci` for deterministic dependency installation and `npm run build` for builds.
5. Add environment values separately for Development, Preview, and Production.
6. Enable preview deployments and require the GitHub quality workflow before merge.
7. Protect the production domain and review access, audit, and retention settings.

## Environment contract

Start from `.env.example`. Next.js replaces `NEXT_PUBLIC_*` values in the browser bundle at build time, so changing them in Hostinger or another host requires a new build and deployment. Public variables are not secrets. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the browser-safe project key and does not replace authorization. `SUPABASE_SECRET_KEY` is privileged, server-only, limited to approved operator tooling, and must be stored in encrypted environment settings only when that tooling runs there. Rotate any value that is accidentally exposed.

### Google Ads on Hostinger

Set these values in the Hostinger build environment before building the production bundle:

```dotenv
NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED=true
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=625xCKaL_58dEN34s_5E
NEXT_PUBLIC_GOOGLE_ADS_TESTING=false
```

`NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` remains the completed-request conversion action. WhatsApp link clicks use the dedicated `GRLaCKXv5KwdEN34s_5E` action and must not reuse the completed-request label.

The application asks each visitor for advertising-measurement consent at runtime and defaults to denied. It does not load the Google tag or send Ads events before acceptance. The choice is stored in browser local storage and can be changed later from the footer; withdrawing consent blocks later events and updates Google consent state if the tag was already loaded. A selected WhatsApp link sends the `whatsapp_opened` event plus exactly one conversion to `AW-18518703197/GRLaCKXv5KwdEN34s_5E`; opening the number picker does not send either event. The request-form privacy acknowledgement remains separate and covers processing the request only. Rebuild after any build-time configuration change, and do not create a real request or synthetic Ads conversion as a deployment test.

## Release verification

For every production release:

1. Confirm CI passed for the deployed commit.
2. Confirm Vercel reports the deployment as Ready.
3. Inspect build logs for warnings and verify configured environment names.
4. Run route, locale, direction, security-header, and critical-journey smoke checks once those routes exist.
5. Record the commit and deployment URL in the release record.

The application serves localized routes and redirects `/` through its locale middleware. A host-branded 404 at both `/` and `/ar` indicates that the request is not reaching the Next.js application; inspect the hosting deployment status, build/runtime logs, selected branch, application root, and domain-to-Node-app mapping.

## Rollback

Promote the last known-good Vercel deployment or revert the faulty Git commit, then verify production again. Never assume application rollback also rolls back database state.
