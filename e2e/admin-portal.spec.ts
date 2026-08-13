import { test, expect } from "@playwright/test";
import {
  ADMIN_AUTH_STATE_PATH,
  ADMIN_LOGOUT_AUTH_STATE_PATH,
} from "./global-setup";

/**
 * The public admin URL prefix — driven by the ADMIN_PATH env var baked into
 * the Next.js production server at startup.  Falls back to the same default
 * used in playwright.config.ts so the tests are self-consistent when run
 * without an explicit env var.
 */
const ADMIN_PATH = process.env.ADMIN_PATH || "e2e-admin-portal";
const ADMIN_ROOT_URL = `/${ADMIN_PATH}`;
const ADMIN_LOGIN_URL = `/${ADMIN_PATH}/login`;
const ADMIN_DASHBOARD_URL = `/${ADMIN_PATH}/dashboard`;

const EXPRESS_API_BASE = "http://localhost:3001/api";

/** Retrieves the latest valid OTP from the test-peek endpoint. */
async function peekOtp(email: string): Promise<number> {
  const response = await fetch(
    `${EXPRESS_API_BASE}/otp/test-peek?email=${encodeURIComponent(email)}`,
  );
  if (!response.ok) {
    throw new Error(`test-peek failed: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { code: number };
  return data.code;
}

/** Unauthenticated browser context (no cookies at all). */
const unauthenticatedTest = test.extend({
  storageState: { cookies: [], origins: [] },
});

/** Authenticated as the E2E admin user. */
const adminTest = test.extend({
  storageState: ADMIN_AUTH_STATE_PATH,
});

/** Isolated admin session used only by the logout test. */
const adminLogoutTest = test.extend({
  storageState: ADMIN_LOGOUT_AUTH_STATE_PATH,
});

// ── Security: direct /portal access is always blocked ──────────────────────

test.describe("Direct /portal access is blocked", () => {
  unauthenticatedTest(
    "should redirect /portal to home when accessed directly",
    async ({ page }) => {
      await page.goto("/portal");
      await expect(page).toHaveURL("/");
    },
  );

  unauthenticatedTest(
    "should redirect /portal/login to home when accessed directly",
    async ({ page }) => {
      await page.goto("/portal/login");
      await expect(page).toHaveURL("/");
    },
  );

  unauthenticatedTest(
    "should redirect /portal/dashboard to home when accessed directly",
    async ({ page }) => {
      await page.goto("/portal/dashboard");
      await expect(page).toHaveURL("/");
    },
  );
});

// ── Unauthenticated routing ─────────────────────────────────────────────────

test.describe("Admin portal unauthenticated routing", () => {
  unauthenticatedTest(
    "should redirect the bare admin path to login",
    async ({ page }) => {
      await page.goto(ADMIN_ROOT_URL);
      await expect(page).toHaveURL(ADMIN_LOGIN_URL);
    },
  );

  unauthenticatedTest(
    "should show the admin login page at the configured ADMIN_PATH",
    async ({ page }) => {
      await page.goto(ADMIN_LOGIN_URL);
      await expect(page).toHaveURL(ADMIN_LOGIN_URL);
      await expect(page.getByRole("heading", { name: "Admin Portal" })).toBeVisible();
    },
  );

  unauthenticatedTest(
    "should redirect unauthenticated users from admin dashboard to admin login",
    async ({ page }) => {
      await page.goto(ADMIN_DASHBOARD_URL);
      await expect(page).toHaveURL(new RegExp(ADMIN_LOGIN_URL));
    },
  );
});

// ── Admin login flow ────────────────────────────────────────────────────────

const OTP_LOGIN_EMAIL = "e2e-admin-otp-login@example.com";

test.describe("Admin login OTP flow", () => {
  unauthenticatedTest("should show email step on login page", async ({ page }) => {
    await page.goto(ADMIN_LOGIN_URL);
    await expect(page.getByLabel("Email Address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send Code" })).toBeVisible();
  });

  unauthenticatedTest(
    "should show an error for an empty email on submit",
    async ({ page }) => {
      await page.goto(ADMIN_LOGIN_URL);
      await page.getByRole("button", { name: "Send Code" }).click();
      await expect(page.locator('[role="alert"].text-destructive')).toContainText(
        /email is required/i,
      );
    },
  );

  unauthenticatedTest(
    "should show an error for an invalid email format",
    async ({ page }) => {
      await page.goto(ADMIN_LOGIN_URL);
      await page.getByLabel("Email Address").fill("not-an-email");
      await page.getByRole("button", { name: "Send Code" }).click();
      await expect(page.locator('[role="alert"].text-destructive')).toContainText(
        /invalid email format/i,
      );
    },
  );

  unauthenticatedTest(
    "should advance to OTP step after submitting a valid email",
    async ({ page }) => {
      await page.goto(ADMIN_LOGIN_URL);
      await page.getByLabel("Email Address").fill(OTP_LOGIN_EMAIL);
      await page.getByRole("button", { name: "Send Code" }).click();

      // Generic message is shown regardless of whether the email is an admin
      await expect(page.getByLabel("Verification Code")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole("button", { name: "Verify & Login" })).toBeVisible();
    },
  );

  unauthenticatedTest(
    "should show an error for a wrong OTP code",
    async ({ page }) => {
      await page.goto(ADMIN_LOGIN_URL);
      await page.getByLabel("Email Address").fill(OTP_LOGIN_EMAIL);
      await page.getByRole("button", { name: "Send Code" }).click();
      await expect(page.getByLabel("Verification Code")).toBeVisible({ timeout: 10_000 });

      await page.getByLabel("Verification Code").fill("100001");
      await page.getByRole("button", { name: "Verify & Login" }).click();
      // Either "Invalid or expired OTP" or "Unauthorized" from the admin verify endpoint
      await expect(page.locator('[role="alert"].text-destructive')).toBeVisible({
        timeout: 10_000,
      });
    },
  );

  unauthenticatedTest(
    "should allow going back to email step via Change Email",
    async ({ page }) => {
      await page.goto(ADMIN_LOGIN_URL);
      await page.getByLabel("Email Address").fill(OTP_LOGIN_EMAIL);
      await page.getByRole("button", { name: "Send Code" }).click();
      await expect(page.getByLabel("Verification Code")).toBeVisible({ timeout: 10_000 });

      await page.getByRole("button", { name: "Change Email" }).click();
      await expect(page.getByLabel("Email Address")).toBeVisible();
    },
  );

  unauthenticatedTest(
    "should log in successfully with the correct OTP and redirect to admin dashboard",
    async ({ page }) => {
      // Use the pre-seeded admin email — only admin emails generate a real OTP
      const ADMIN_EMAIL = "e2e-admin@example.com";

      await page.goto(ADMIN_LOGIN_URL);
      await page.getByLabel("Email Address").fill(ADMIN_EMAIL);
      await page.getByRole("button", { name: "Send Code" }).click();
      await expect(page.getByLabel("Verification Code")).toBeVisible({ timeout: 10_000 });

      const code = await peekOtp(ADMIN_EMAIL);
      await page.getByLabel("Verification Code").fill(String(code));
      await page.getByRole("button", { name: "Verify & Login" }).click();

      await expect(page).toHaveURL(new RegExp(ADMIN_DASHBOARD_URL), { timeout: 15_000 });
    },
  );
});

// ── Authenticated admin routing ─────────────────────────────────────────────

test.describe("Authenticated admin routing", () => {
  adminTest(
    "should redirect the bare admin path to the dashboard",
    async ({ page }) => {
      await page.goto(ADMIN_ROOT_URL);
      await expect(page).toHaveURL(ADMIN_DASHBOARD_URL);
    },
  );

  adminTest(
    "should allow an authenticated admin to access the dashboard",
    async ({ page }) => {
      await page.goto(ADMIN_DASHBOARD_URL);
      await expect(page).toHaveURL(ADMIN_DASHBOARD_URL);
      await expect(page.getByRole("heading", { name: "Admin Portal" })).toBeVisible();
    },
  );

  adminTest(
    "should redirect an authenticated admin away from login to dashboard",
    async ({ page }) => {
      await page.goto(ADMIN_LOGIN_URL);
      await expect(page).toHaveURL(new RegExp(ADMIN_DASHBOARD_URL));
    },
  );
});

// ── Admin logout ────────────────────────────────────────────────────────────

test.describe("Admin logout", () => {
  adminLogoutTest(
    "should log out and lose access to the admin dashboard",
    async ({ page }) => {
      // Verify we can access the dashboard first
      await page.goto(ADMIN_DASHBOARD_URL);
      await expect(page).toHaveURL(ADMIN_DASHBOARD_URL);

      // Call the logout API directly
      const logoutResponse = await page.request.post("/api/admin/auth/logout");
      expect(logoutResponse.ok()).toBe(true);

      // Navigate to dashboard — should now redirect to login
      await page.goto(ADMIN_DASHBOARD_URL);
      await expect(page).toHaveURL(new RegExp(ADMIN_LOGIN_URL));
    },
  );
});
