/**
 * HMAC-signed session verification cookie helpers.
 *
 * At login time a companion cookie `session_sig` is written alongside
 * `session_token`.  It carries the session expiry and an HMAC-SHA256
 * signature so the Edge middleware can verify authenticity and freshness
 * without touching the database.
 *
 * Cookie value format:  "{expiresAtSec}.{hmacHex}"
 * HMAC input:           "{sessionToken}:{expiresAtSec}"
 * Secret env var:       SESSION_COOKIE_SECRET
 *
 * Uses the Web Crypto API (crypto.subtle) so it works in both the Node.js
 * runtime and the Next.js Edge runtime.
 */

export const SESSION_SIG_COOKIE_NAME = "session_sig";

/**
 * Expires both session cookies on a Next.js response.
 * Use in API routes that need to clear the session (logout, expired session).
 */
export function clearSessionCookies(response: { cookies: { set: (name: string, value: string, options: object) => void } }): void {
  const expiredOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
  response.cookies.set("session_token", "", expiredOptions);
  response.cookies.set(SESSION_SIG_COOKIE_NAME, "", expiredOptions);
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

/**
 * Create the `session_sig` cookie value for the given session.
 *
 * @param sessionToken - The opaque session token stored in `session_token`
 * @param expiresAt    - The exact expiry date used for the DB session record
 * @returns            The string to store in the `session_sig` cookie
 */
export async function signSessionCookie(
  sessionToken: string,
  expiresAt: Date,
): Promise<string> {
  const secret = process.env.SESSION_COOKIE_SECRET;
  if (!secret) {
    throw new Error("SESSION_COOKIE_SECRET environment variable is not set");
  }
  const expiresAtSec = Math.floor(expiresAt.getTime() / 1000);
  const hmac = await hmacSha256(secret, `${sessionToken}:${expiresAtSec}`);
  return `${expiresAtSec}.${hmac}`;
}

/**
 * Verify a `session_sig` cookie value against the accompanying `session_token`.
 *
 * Returns `true` only when:
 *   1. The value can be parsed as "{expiresAtSec}.{hmacHex}"
 *   2. The HMAC matches (proves the server created this pair)
 *   3. The expiry timestamp is in the future
 *
 * @param sessionToken - Value from the `session_token` cookie
 * @param sessionSig   - Value from the `session_sig` cookie
 * @param secret       - The SESSION_COOKIE_SECRET
 */
export async function verifySessionCookie(
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

  const expectedHmac = await hmacSha256(
    secret,
    `${sessionToken}:${expiresAtSec}`,
  );

  return expectedHmac === providedHmac;
}
