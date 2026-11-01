import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

// Intentionally cannot target a remote site or read real Supabase credentials.
const environment = {
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3107",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_release_fixture",
  SUPABASE_SECRET_KEY: "sb_secret_release_fixture",
  NEXT_PUBLIC_GOOGLE_ADS_TRACKING_ENABLED: "false",
  NEXT_PUBLIC_GOOGLE_ADS_TESTING: "false",
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_OPTIONS: `--require ${JSON.stringify(resolve("tests/fixtures/local-network-only.cjs"))}`,
};

export default defineConfig({
  testDir: "./tests/release",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  reporter: "list",
  outputDir: "/tmp/naqlk-release-playwright-results",
  use: {
    baseURL: "http://127.0.0.1:3107",
    browserName: "firefox",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/fixtures/release-supabase.mjs",
      url: "http://127.0.0.1:54329/__health",
      reuseExistingServer: false,
    },
    {
      command: "npm start -- --hostname 127.0.0.1 --port 3107",
      url: "http://127.0.0.1:3107/en/privacy",
      env: environment,
      reuseExistingServer: false,
    },
  ],
});
