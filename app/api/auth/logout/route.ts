import { NextResponse } from "next/server";
import { isSameOrigin, isSecureRequest, PRIVATE_CACHE } from "@/lib/auth/request";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Forbidden" },
      {
        status: 403,
        headers: { "Cache-Control": PRIVATE_CACHE, "X-Content-Type-Options": "nosniff" },
      },
    );
  }

  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": PRIVATE_CACHE, "X-Content-Type-Options": "nosniff" } },
  );
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(isSecureRequest(request)),
    maxAge: 0,
  });
  return response;
}
