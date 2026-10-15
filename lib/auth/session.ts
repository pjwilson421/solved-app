import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** HttpOnly session cookie. Not `__Host-` so local http can set it; `Secure` is added on https. */
export const SESSION_COOKIE = "solved_session";

/** 12 hours, matching SOLVED Studio. */
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export function sessionConfigured(): boolean {
  return Boolean(process.env.STUDIO_PASSWORD && process.env.STUDIO_SESSION_SECRET);
}

function secret(): string {
  return process.env.STUDIO_SESSION_SECRET ?? "";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

/** SHA-256 both sides so the comparison stays constant-time for unequal lengths. */
export function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(left, right);
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.STUDIO_PASSWORD;
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function issueSession(): string {
  const value = `${Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS}.${randomBytes(24).toString("base64url")}`;
  return `${value}.${sign(value)}`;
}

export function isValidSession(token: string | undefined | null): boolean {
  if (!sessionConfigured() || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresPart, nonce, signature] = parts;
  if (!expiresPart || !nonce || !signature || !/^\d+$/.test(expiresPart)) return false;
  const expires = Number(expiresPart);
  const now = Math.floor(Date.now() / 1000);
  if (!(expires > now && expires <= now + SESSION_TTL_SECONDS)) return false;
  return safeEqual(signature, sign(`${expiresPart}.${nonce}`));
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
