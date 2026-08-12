import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";
import {
  ADMIN_SESSION_SIG_COOKIE_NAME,
  ADMIN_SESSION_TOKEN_COOKIE_NAME,
  signAdminSessionCookie,
} from "../lib/adminSessionCookieSig";

const ADMIN_PATH = "e2e-admin-portal";
const ADMIN_SESSION_SECRET = "test-admin-secret-for-middleware-tests-123456";

describe("admin portal middleware routing", () => {
  beforeEach(() => {
    process.env.ADMIN_PATH = ADMIN_PATH;
    process.env.ADMIN_SESSION_COOKIE_SECRET = ADMIN_SESSION_SECRET;
  });

  afterEach(() => {
    delete process.env.ADMIN_PATH;
    delete process.env.ADMIN_SESSION_COOKIE_SECRET;
  });

  it("redirects an unauthenticated bare admin path to login", async () => {
    const request = new NextRequest(`http://localhost/${ADMIN_PATH}`);

    const response = await middleware(request);

    expect(response.headers.get("location")).toBe(`http://localhost/${ADMIN_PATH}/login`);
  });

  it("redirects an authenticated bare admin path to the dashboard", async () => {
    const sessionToken = "admin-session-token";
    const sessionSig = await signAdminSessionCookie(
      sessionToken,
      new Date(Date.now() + 60 * 60 * 1000),
    );
    const request = new NextRequest(`http://localhost/${ADMIN_PATH}`, {
      headers: {
        cookie: `${ADMIN_SESSION_TOKEN_COOKIE_NAME}=${sessionToken}; ${ADMIN_SESSION_SIG_COOKIE_NAME}=${sessionSig}`,
      },
    });

    const response = await middleware(request);

    expect(response.headers.get("location")).toBe(`http://localhost/${ADMIN_PATH}/dashboard`);
  });
});
