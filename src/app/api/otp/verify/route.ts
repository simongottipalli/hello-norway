import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_BASE_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_URL}/otp/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Create NextResponse with status
    const nextResponse = NextResponse.json(data, { status: response.status });

    // Propagate relevant headers from backend response
    const headersToPropagate = [
      'Retry-After',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ];

    headersToPropagate.forEach(headerName => {
      const headerValue = response.headers.get(headerName);
      if (headerValue) {
        nextResponse.headers.set(headerName, headerValue);
      }
    });

    return nextResponse;
  } catch (error: unknown) {
    console.error("Error in OTP verify route:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
