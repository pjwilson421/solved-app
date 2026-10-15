import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth/session";

export const PRIVATE_CACHE = "private, no-store, max-age=0";

export function isSecureRequest(request: Request): boolean {
  if (new URL(request.url).protocol === "https:") return true;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return proto === "https";
}

/** Reject cross-site login posts. Compares Origin to the Host header the browser sent. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Relative in-app path only. Drops protocol-relative and login loops. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://")
  ) {
    return null;
  }
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    decoded.includes("://") ||
    decoded.startsWith("/login")
  ) {
    return null;
  }
  return value;
}

/** Defense in depth for paid API routes. Proxy already rejects missing sessions. */
export async function requireApiSession(): Promise<Response | null> {
  if (!process.env.STUDIO_PASSWORD || !process.env.STUDIO_SESSION_SECRET) {
    return Response.json(
      { error: "Sign-in is temporarily unavailable." },
      {
        status: 503,
        headers: { "Cache-Control": PRIVATE_CACHE, "X-Content-Type-Options": "nosniff" },
      },
    );
  }
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) {
    return Response.json(
      { error: "Sign in required" },
      {
        status: 401,
        headers: { "Cache-Control": PRIVATE_CACHE, "X-Content-Type-Options": "nosniff" },
      },
    );
  }
  return null;
}
