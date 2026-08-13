/**
 * HMAC-signed session cookie helpers for the admin portal.
 *
 * Mirrors sessionCookieSig.ts but uses ADMIN_SESSION_COOKIE_SECRET and
 * separate cookie names so admin and regular user sessions are fully isolated.
 *
 * Cookie names: "admin_session_token" + "admin_session_sig"
 * HMAC input:   "{sessionToken}:{expiresAtSec}"
 */

export const ADMIN_SESSION_TOKEN_COOKIE_NAME = "admin_session_token";
export const ADMIN_SESSION_SIG_COOKIE_NAME = "admin_session_sig";

export function clearAdminSessionCookies(response: {
  cookies: { set: (name: string, value: string, options: object) => void };
}): void {
  const expiredOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
  response.cookies.set(ADMIN_SESSION_TOKEN_COOKIE_NAME, "", expiredOptions);
  response.cookies.set(ADMIN_SESSION_SIG_COOKIE_NAME, "", expiredOptions);
}

async function hmacSha256(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signAdminSessionCookie(
  sessionToken: string,
  expiresAt: Date,
): Promise<string> {
  const secret = process.env.ADMIN_SESSION_COOKIE_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_COOKIE_SECRET environment variable is not set");
  }
  const expiresAtSec = Math.floor(expiresAt.getTime() / 1000);
  const hmac = await hmacSha256(secret, `${sessionToken}:${expiresAtSec}`);
  return `${expiresAtSec}.${hmac}`;
}

export async function verifyAdminSessionCookie(
  sessionToken: string,
  sessionSig: string,
  secret: string,
): Promise<boolean> {
  const dotIdx = sessionSig.indexOf(".");
  if (dotIdx === -1) return false;

  const expStr = sessionSig.slice(0, dotIdx);
  const providedHmac = sessionSig.slice(dotIdx + 1);

  const expiresAtSec = parseInt(expStr, 10);
  if (!Number.isFinite(expiresAtSec)) return false;

  if (expiresAtSec <= Math.floor(Date.now() / 1000)) return false;

  const expectedHmac = await hmacSha256(secret, `${sessionToken}:${expiresAtSec}`);
  return expectedHmac === providedHmac;
}
