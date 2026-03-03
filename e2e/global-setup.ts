import { chromium, FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { config as loadDotenv } from "dotenv";

// Load .env so the script picks up vars whether it is run
// directly or via `playwright test` (which doesn't go through Next.js).
loadDotenv({ path: path.join(process.cwd(), ".env") });

// Inline the HMAC signing so this file has no runtime import from src/
async function signSessionCookie(
  sessionToken: string,
  expiresAt: Date,
  secret: string,
): Promise<string> {
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
export const AUTH_STATE_PATH = path.join(__dirname, ".auth", "user.json");

export default async function globalSetup(_config: FullConfig) {
  // Require a session secret — same var the app uses.
  const secret = process.env.SESSION_COOKIE_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_COOKIE_SECRET env var must be set to run E2E tests",
    );
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
  const { sessionToken, expiresAt: expiresAtISO } = JSON.parse(jsonLine);
  const expiresAt = new Date(expiresAtISO);

  const sessionSig = await signSessionCookie(sessionToken, expiresAt, secret);

  // Persist cookies as Playwright storageState so every test starts authed.
  fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();

  await context.addCookies([
    {
      name: "session_token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "session_sig",
      value: sessionSig,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await context.storageState({ path: AUTH_STATE_PATH });
  await browser.close();
}
