import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { config as loadDotenv } from "dotenv";

// Load .env so the script picks up vars whether it is run
// directly or via `playwright test` (which doesn't go through Next.js).
loadDotenv({ path: path.join(process.cwd(), ".env") });

// Inline the HMAC signing so this file has no runtime import from src/
async function signCookie(sessionToken: string, expiresAt: Date, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expiresAtSec = Math.floor(expiresAt.getTime() / 1000);
  const sig = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${sessionToken}:${expiresAtSec}`),
  );
  const hmac = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${expiresAtSec}.${hmac}`;
}

export const TEST_USER_EMAIL = "e2e-test@example.com";
export const TEST_ADMIN_EMAIL = "e2e-admin@example.com";
export const AUTH_STATE_PATH = path.join(__dirname, ".auth", "user.json");
export const LOGOUT_AUTH_STATE_PATH = path.join(__dirname, ".auth", "user-logout.json");
export const ADMIN_AUTH_STATE_PATH = path.join(__dirname, ".auth", "admin.json");
export const ADMIN_LOGOUT_AUTH_STATE_PATH = path.join(__dirname, ".auth", "admin-logout.json");

export default async function globalSetup() {
  // Require a session secret — same var the app uses.
  const secret = process.env.SESSION_COOKIE_SECRET;
  if (!secret) {
    throw new Error("SESSION_COOKIE_SECRET env var must be set to run E2E tests");
  }

  // Run Prisma operations in a tsx subprocess because the Prisma 6
  // generated client is ESM TypeScript (uses `import.meta.url`) which
  // is incompatible with Playwright's esbuild CJS transpilation.
  const helperScript = path.join(__dirname, "helpers", "db-setup.ts");
  let raw: string;
  try {
    raw = execSync(`npx tsx "${helperScript}" "${TEST_USER_EMAIL}"`, {
      encoding: "utf-8",
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`E2E global-setup: db-setup helper failed: ${msg}`);
  }

  // The helper prints exactly one JSON line to stdout.
  const jsonLine = raw.split("\n").pop()!.trim();
  const parsed = JSON.parse(jsonLine);
  const { sessionToken, logoutSessionToken, expiresAt: expiresAtISO } = parsed;
  const expiresAt = new Date(expiresAtISO);

  const sessionSig = await signCookie(sessionToken, expiresAt, secret);
  const logoutSessionSig = await signCookie(logoutSessionToken, expiresAt, secret);

  // Persist cookies as Playwright storageState so every test starts authed.
  fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });

  const browser = await chromium.launch();

  // Main session: used by all regular-user tests.
  const mainContext = await browser.newContext();
  await mainContext.addCookies([
    { name: "session_token", value: sessionToken, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
    { name: "session_sig", value: sessionSig, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
  ]);
  await mainContext.storageState({ path: AUTH_STATE_PATH });

  // Logout session: isolated session used only by the logout test.
  const logoutContext = await browser.newContext();
  await logoutContext.addCookies([
    { name: "session_token", value: logoutSessionToken, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
    { name: "session_sig", value: logoutSessionSig, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
  ]);
  await logoutContext.storageState({ path: LOGOUT_AUTH_STATE_PATH });

  // ── Admin portal sessions (only if ADMIN_PATH + ADMIN_SESSION_COOKIE_SECRET are set) ──
  const adminPath = process.env.ADMIN_PATH;
  const adminSecret = process.env.ADMIN_SESSION_COOKIE_SECRET;

  if (adminPath && adminSecret) {
    const adminHelperScript = path.join(__dirname, "helpers", "admin-db-setup.ts");
    let adminRaw: string;
    try {
      adminRaw = execSync(`npx tsx "${adminHelperScript}" "${TEST_ADMIN_EMAIL}"`, {
        encoding: "utf-8",
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`E2E global-setup: admin-db-setup helper failed: ${msg}`);
    }

    const adminJsonLine = adminRaw.split("\n").pop()!.trim();
    const adminParsed = JSON.parse(adminJsonLine);
    const {
      sessionToken: adminSessionToken,
      logoutSessionToken: adminLogoutSessionToken,
      expiresAt: adminExpiresAtISO,
    } = adminParsed;
    const adminExpiresAt = new Date(adminExpiresAtISO);

    const adminSessionSig = await signCookie(adminSessionToken, adminExpiresAt, adminSecret);
    const adminLogoutSessionSig = await signCookie(
      adminLogoutSessionToken,
      adminExpiresAt,
      adminSecret,
    );

    // Admin main session
    const adminContext = await browser.newContext();
    await adminContext.addCookies([
      { name: "admin_session_token", value: adminSessionToken, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
      { name: "admin_session_sig", value: adminSessionSig, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
    ]);
    await adminContext.storageState({ path: ADMIN_AUTH_STATE_PATH });

    // Admin logout session
    const adminLogoutContext = await browser.newContext();
    await adminLogoutContext.addCookies([
      { name: "admin_session_token", value: adminLogoutSessionToken, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
      { name: "admin_session_sig", value: adminLogoutSessionSig, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
    ]);
    await adminLogoutContext.storageState({ path: ADMIN_LOGOUT_AUTH_STATE_PATH });
  }

  await browser.close();
}
