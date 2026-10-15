import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/request";
import { isValidSession, SESSION_COOKIE, sessionConfigured } from "@/lib/auth/session";

/**
 * Gate for every page and API route.
 * Next.js 16 renamed Middleware to Proxy (`proxy.ts`); this is that layer.
 * Login, logout, and static assets stay public. Everything else needs a session.
 */

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$/i.test(pathname);
}

function unavailable(pathname: string) {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable." },
      { status: 503, headers },
    );
  }
  return new NextResponse("Sign-in is temporarily unavailable.", {
    status: 503,
    headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
  });
}

function signInRequired(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };

  if (pathname.startsWith("/api/") || (request.method !== "GET" && request.method !== "HEAD")) {
    const isApi = pathname.startsWith("/api/");
    return new NextResponse(
      request.method === "HEAD" ? null : isApi ? JSON.stringify({ error: "Sign in required" }) : "Sign in required",
      {
        status: 401,
        headers: {
          ...headers,
          "Content-Type": isApi ? "application/json" : "text/plain; charset=utf-8",
        },
      },
    );
  }

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  const next = safeNextPath(pathname + search);
  if (next && next !== "/") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isStaticAsset(pathname)) return NextResponse.next();

  if (!sessionConfigured()) return unavailable(pathname);

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = isValidSession(token);

  if (PUBLIC_PATHS.has(pathname)) {
    if (pathname === "/login" && signedIn) {
      const next = safeNextPath(request.nextUrl.searchParams.get("next")) ?? "/chat";
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.next();
  }

  if (signedIn) return NextResponse.next();
  return signInRequired(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
