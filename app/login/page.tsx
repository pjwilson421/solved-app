import type { Metadata } from "next";
import { safeNextPath } from "@/lib/auth/request";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · SOLVED",
};

type LoginSearch = {
  next?: string | string[];
  error?: string | string[];
};

function first(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearch>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(first(params.next)) ?? "/chat";
  const errorCode = first(params.error) ?? "";

  return <LoginForm nextPath={nextPath} errorCode={errorCode} />;
}
