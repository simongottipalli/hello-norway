import { chromium, FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";
import crypto from "crypto";
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

  // Late-import Prisma so it only loads after the env check above.
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    // Upsert a stable test user so re-runs don't create duplicates.
    const user = await prisma.user.upsert({
      where: { email: TEST_USER_EMAIL },
      update: {},
      create: {
        email: TEST_USER_EMAIL,
        name: "E2E Test User",
      },
    });

    // Create a fresh session that lives for 24 hours.
    const sessionToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: { sessionToken, userId: user.id, expiresAt },
    });

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
  } finally {
    await prisma.$disconnect();
  }
}
