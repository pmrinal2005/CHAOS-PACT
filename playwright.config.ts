import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "workspace.spec.ts",
  testIgnore: "**/legacy/**",
  timeout: 30000,
  fullyParallel: false,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3000",
    viewport: { width: 1440, height: 950 },
    headless: true,
    trace: "retain-on-failure",
    // Optional: point at a system Chromium (e.g. CI images without Playwright's bundled browser).
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
    ...(process.env.WORKSPACE_PASSWORD ? { httpCredentials: { username: "operator", password: process.env.WORKSPACE_PASSWORD } } : {}),
  },
});
