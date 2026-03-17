import { NextResponse } from "next/server";

const RATE_LIMIT_HEADERS = [
  "Retry-After",
  "X-RateLimit-Limit",
  "X-RateLimit-Remaining",
  "X-RateLimit-Reset",
] as const;

/**
 * Copies rate-limit headers from a backend Response to a Next.js response.
 */
export function forwardRateLimitHeaders(src: Response, dest: NextResponse): void {
  for (const header of RATE_LIMIT_HEADERS) {
    const value = src.headers.get(header);
    if (value) {
      dest.headers.set(header, value);
    }
  }
}
