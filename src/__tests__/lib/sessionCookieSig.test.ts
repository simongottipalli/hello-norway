import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  signSessionCookie,
  verifySessionCookie,
  SESSION_SIG_COOKIE_NAME,
} from "../../lib/sessionCookieSig";

const TEST_SECRET = "test-secret-at-least-32-characters-long";
const TEST_TOKEN = "abc123def456abc123def456abc123def456";

describe("SESSION_SIG_COOKIE_NAME", () => {
  it("is session_sig", () => {
    expect(SESSION_SIG_COOKIE_NAME).toBe("session_sig");
  });
});

describe("signSessionCookie", () => {
  const originalEnv = process.env.SESSION_COOKIE_SECRET;

  beforeEach(() => {
    process.env.SESSION_COOKIE_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    process.env.SESSION_COOKIE_SECRET = originalEnv;
  });

  it("returns a string in {expiresAtSec}.{hmacHex} format", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const sig = await signSessionCookie(TEST_TOKEN, expiresAt);

    expect(typeof sig).toBe("string");
    const parts = sig.split(".");
    expect(parts).toHaveLength(2);

    const [expStr, hmac] = parts;
    expect(Number.isInteger(parseInt(expStr, 10))).toBe(true);
    expect(hmac).toMatch(/^[0-9a-f]{64}$/);
  });

  it("embeds the correct expiry unix timestamp", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const expectedSec = Math.floor(expiresAt.getTime() / 1000);
    const sig = await signSessionCookie(TEST_TOKEN, expiresAt);

    const [expStr] = sig.split(".");
    expect(parseInt(expStr, 10)).toBe(expectedSec);
  });

  it("produces different signatures for different session tokens", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const sig1 = await signSessionCookie("token-aaa", expiresAt);
    const sig2 = await signSessionCookie("token-bbb", expiresAt);

    expect(sig1).not.toBe(sig2);
  });

  it("throws when SESSION_COOKIE_SECRET is not set", async () => {
    delete process.env.SESSION_COOKIE_SECRET;

    await expect(
      signSessionCookie(TEST_TOKEN, new Date(Date.now() + 60_000)),
    ).rejects.toThrow("SESSION_COOKIE_SECRET");
  });
});

describe("verifySessionCookie", () => {
  it("returns true for a valid, unexpired signature", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    process.env.SESSION_COOKIE_SECRET = TEST_SECRET;
    const sig = await signSessionCookie(TEST_TOKEN, expiresAt);

    const result = await verifySessionCookie(TEST_TOKEN, sig, TEST_SECRET);
    expect(result).toBe(true);
  });

  it("returns false for an expired signature", async () => {
    const expiresAt = new Date(Date.now() - 1_000);
    process.env.SESSION_COOKIE_SECRET = TEST_SECRET;
    const sig = await signSessionCookie(TEST_TOKEN, expiresAt);

    const result = await verifySessionCookie(TEST_TOKEN, sig, TEST_SECRET);
    expect(result).toBe(false);
  });

  it("returns false when the session token is swapped", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    process.env.SESSION_COOKIE_SECRET = TEST_SECRET;
    const sig = await signSessionCookie(TEST_TOKEN, expiresAt);

    const result = await verifySessionCookie("different-token", sig, TEST_SECRET);
    expect(result).toBe(false);
  });

  it("returns false when the HMAC is tampered with", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    process.env.SESSION_COOKIE_SECRET = TEST_SECRET;
    const sig = await signSessionCookie(TEST_TOKEN, expiresAt);

    const [expStr] = sig.split(".");
    const tampered = `${expStr}.${"0".repeat(64)}`;

    const result = await verifySessionCookie(TEST_TOKEN, tampered, TEST_SECRET);
    expect(result).toBe(false);
  });

  it("returns false when the expiry is tampered with", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    process.env.SESSION_COOKIE_SECRET = TEST_SECRET;
    const sig = await signSessionCookie(TEST_TOKEN, expiresAt);

    const [, hmac] = sig.split(".");
    const farFutureSec = Math.floor(Date.now() / 1000) + 999_999;
    const tampered = `${farFutureSec}.${hmac}`;

    const result = await verifySessionCookie(TEST_TOKEN, tampered, TEST_SECRET);
    expect(result).toBe(false);
  });

  it("returns false when the secret is wrong", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    process.env.SESSION_COOKIE_SECRET = TEST_SECRET;
    const sig = await signSessionCookie(TEST_TOKEN, expiresAt);

    const result = await verifySessionCookie(TEST_TOKEN, sig, "wrong-secret");
    expect(result).toBe(false);
  });

  it("returns false for a completely fabricated cookie value", async () => {
    const result = await verifySessionCookie(TEST_TOKEN, "junk", TEST_SECRET);
    expect(result).toBe(false);
  });

  it("returns false for an empty string", async () => {
    const result = await verifySessionCookie(TEST_TOKEN, "", TEST_SECRET);
    expect(result).toBe(false);
  });

  it("returns false for a non-numeric expiry", async () => {
    const result = await verifySessionCookie(
      TEST_TOKEN,
      `notanumber.${"a".repeat(64)}`,
      TEST_SECRET,
    );
    expect(result).toBe(false);
  });
});
