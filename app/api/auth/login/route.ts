import { NextResponse } from "next/server";
import {
  clearFailedLogins,
  clientIp,
  loginAttemptAllowed,
  recordFailedLogin,
} from "@/lib/auth/rate-limit";
import { isSameOrigin, isSecureRequest, PRIVATE_CACHE, safeNextPath } from "@/lib/auth/request";
import {
  issueSession,
  passwordMatches,
  SESSION_COOKIE,
  sessionConfigured,
  sessionCookieOptions,
} from "@/lib/auth/session";

const MAX_BODY = 4096;

function json(body: unknown, status: number, extra?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": PRIVATE_CACHE,
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}

function readPassword(raw: string, contentType: string): { password: string; next: string | null } {
  if (contentType.includes("application/json")) {
    const data = JSON.parse(raw) as { password?: unknown; next?: unknown };
    return {
      password: typeof data.password === "string" ? data.password : "",
      next: typeof data.next === "string" ? data.next : null,
    };
  }
  const params = new URLSearchParams(raw);
  return { password: params.get("password") || "", next: params.get("next") };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const asJson = contentType.includes("application/json");

  if (!sessionConfigured()) {
    return json({ error: "Sign-in is temporarily unavailable." }, 503);
  }
  if (!isSameOrigin(request)) {
    return json({ error: "Forbidden" }, 403);
  }

  const ip = clientIp(request);
  const limit = loginAttemptAllowed(ip);
  if (!limit.ok) {
    const message = "Too many attempts. Try again in 15 minutes.";
    if (!asJson) {
      const back = new URL("/login", request.url);
      back.searchParams.set("error", "rate");
      return NextResponse.redirect(back, 303);
    }
    return json({ error: message }, 429, { "Retry-After": String(limit.retryAfter) });
  }

  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY) {
    return json({ error: "Request too large" }, 413);
  }

  let raw = "";
  try {
    raw = await request.text();
  } catch {
    raw = "";
  }
  if (raw.length > MAX_BODY) {
    return json({ error: "Request too large" }, 413);
  }

  let password = "";
  let next: string | null = null;
  try {
    const parsed = readPassword(raw, contentType);
    password = parsed.password;
    next = parsed.next;
  } catch {
    password = "";
  }

  if (password.length === 0 || password.length > 256 || !passwordMatches(password)) {
    recordFailedLogin(ip);
    const message = "Incorrect password. Please try again.";
    if (!asJson) {
      const back = new URL("/login", request.url);
      const safe = safeNextPath(next);
      if (safe) back.searchParams.set("next", safe);
      back.searchParams.set("error", "1");
      return NextResponse.redirect(back, 303);
    }
    return json({ error: message }, 401);
  }

  clearFailedLogins(ip);
  const destination = safeNextPath(next) ?? "/chat";
  const response = asJson
    ? json({ ok: true }, 200)
    : NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set(
    SESSION_COOKIE,
    issueSession(),
    sessionCookieOptions(isSecureRequest(request)),
  );
  response.headers.set("Cache-Control", PRIVATE_CACHE);
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
