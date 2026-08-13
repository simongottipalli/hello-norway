import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";
import {
  ADMIN_SESSION_SIG_COOKIE_NAME,
  ADMIN_SESSION_TOKEN_COOKIE_NAME,
  signAdminSessionCookie,
} from "../lib/adminSessionCookieSig";
import { SESSION_SIG_COOKIE_NAME, signSessionCookie } from "../lib/sessionCookieSig";

const ADMIN_PATH = "e2e-admin-portal";
const ADMIN_SESSION_SECRET = "test-admin-secret-for-middleware-tests-123456";
const SESSION_SECRET = "test-session-secret-for-middleware-tests-123456";

const createRequest = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost${path}`, {
    headers: cookie ? { cookie } : undefined,
  });

describe("admin portal middleware routing", () => {
  beforeEach(() => {
    process.env.ADMIN_PATH = ADMIN_PATH;
    process.env.ADMIN_SESSION_COOKIE_SECRET = ADMIN_SESSION_SECRET;
    process.env.SESSION_COOKIE_SECRET = SESSION_SECRET;
  });

  afterEach(() => {
    delete process.env.ADMIN_PATH;
    delete process.env.ADMIN_SESSION_COOKIE_SECRET;
    delete process.env.SESSION_COOKIE_SECRET;
  });

  it.each(["/api/health", "/_next/static/chunk.js"])(
    "bypasses middleware for %s",
    async (path) => {
      const response = await middleware(createRequest(path));

      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );

  it.each(["/portal", "/portal/login"])("blocks direct internal portal path %s", async (path) => {
    const response = await middleware(createRequest(path));

    expect(response.headers.get("location")).toBe("http://localhost/");
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

  it("redirects an unauthenticated admin dashboard request to login", async () => {
    const response = await middleware(createRequest(`/${ADMIN_PATH}/dashboard`));

    expect(response.headers.get("location")).toBe(`http://localhost/${ADMIN_PATH}/login`);
  });

  it("treats an admin session as unauthenticated when its signing secret is unavailable", async () => {
    delete process.env.ADMIN_SESSION_COOKIE_SECRET;

    const response = await middleware(
      createRequest(
        `/${ADMIN_PATH}/dashboard`,
        `${ADMIN_SESSION_TOKEN_COOKIE_NAME}=token; ${ADMIN_SESSION_SIG_COOKIE_NAME}=signature`,
      ),
    );

    expect(response.headers.get("location")).toBe(`http://localhost/${ADMIN_PATH}/login`);
  });

  it("redirects an authenticated admin login request to the dashboard", async () => {
    const sessionToken = "admin-login-session-token";
    const sessionSig = await signAdminSessionCookie(
      sessionToken,
      new Date(Date.now() + 60 * 60 * 1000),
    );

    const response = await middleware(
      createRequest(
        `/${ADMIN_PATH}/login`,
        `${ADMIN_SESSION_TOKEN_COOKIE_NAME}=${sessionToken}; ${ADMIN_SESSION_SIG_COOKIE_NAME}=${sessionSig}`,
      ),
    );

    expect(response.headers.get("location")).toBe(`http://localhost/${ADMIN_PATH}/dashboard`);
  });

  it("rewrites a permitted admin route to its internal portal path", async () => {
    const response = await middleware(createRequest(`/${ADMIN_PATH}/reports`));

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      `http://localhost/portal/reports`,
    );
  });

  it("allows public regular routes", async () => {
    const response = await middleware(createRequest("/about"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects unauthenticated protected regular routes to login with the return URL", async () => {
    const response = await middleware(createRequest("/dashboard?tab=tasks"));

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?redirect=%2Fdashboard%3Ftab%3Dtasks",
    );
  });

  it("allows authenticated protected regular routes", async () => {
    const sessionToken = "regular-dashboard-session-token";
    const sessionSig = await signSessionCookie(
      sessionToken,
      new Date(Date.now() + 60 * 60 * 1000),
    );

    const response = await middleware(
      createRequest("/profile", `session_token=${sessionToken}; ${SESSION_SIG_COOKIE_NAME}=${sessionSig}`),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("treats a regular session as unauthenticated when its signing secret is unavailable", async () => {
    delete process.env.SESSION_COOKIE_SECRET;

    const response = await middleware(
      createRequest("/dashboard", `session_token=token; ${SESSION_SIG_COOKIE_NAME}=signature`),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?redirect=%2Fdashboard",
    );
  });

  it("redirects an authenticated regular user away from login", async () => {
    const sessionToken = "regular-login-session-token";
    const sessionSig = await signSessionCookie(
      sessionToken,
      new Date(Date.now() + 60 * 60 * 1000),
    );

    const response = await middleware(
      createRequest("/login", `session_token=${sessionToken}; ${SESSION_SIG_COOKIE_NAME}=${sessionSig}`),
    );

    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("allows an unauthenticated regular login request", async () => {
    const response = await middleware(createRequest("/login"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
