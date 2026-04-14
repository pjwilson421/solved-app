"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Header } from "@/components/create-image/Header";
import { Sidebar } from "@/components/create-image/Sidebar";
import { LeftNavRail } from "@/components/shell/LeftNavRail";
import { useShellNav } from "@/lib/use-shell-nav";

type SettingsRouteClientProps = {
  title: string;
  description?: string;
  /** When set, replaces the default description block (e.g. Help). */
  children?: ReactNode;
};

export function SettingsRouteClient({
  title,
  description = "This section will be available in a future update.",
  children,
}: SettingsRouteClientProps) {
  const { navigate, activeMainNav } = useShellNav();

  return (
    <div
      className={cn(
        "flex h-dvh min-h-0 flex-col overflow-hidden bg-app-bg text-tx-primary",
        "xl:[--create-image-prompt-max:1000px]",
      )}
    >
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden xl:flex">
        <div className="hidden shrink-0 xl:block">
          <Header variant="desktop" />
        </div>
        <div className="shrink-0 xl:hidden">
          <Header variant="mobile" mobileTitle="SETTINGS" />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden xl:grid xl:grid-cols-[300px_minmax(0,1fr)]">
          <LeftNavRail className="hidden min-h-0 h-full shrink-0 xl:flex">
            <Sidebar
              className="flex min-h-0 min-w-0 w-full flex-1 flex-col"
              activeId={activeMainNav}
              onNavigate={navigate}
            />
          </LeftNavRail>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 pt-6 md:px-8 xl:px-10 xl:pb-4">
            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-edge-subtle bg-rail-navy",
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-6">
                <h1 className="text-left text-[13px] font-semibold uppercase tracking-[0.08em] text-white">
                  {title}
                </h1>
                {children ? (
                  <div className="mt-6 max-w-2xl">{children}</div>
                ) : (
                  <p className="mt-4 max-w-lg text-[13px] leading-relaxed text-tx-secondary">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-bg xl:hidden">
        <Header variant="mobile" mobileTitle="SETTINGS" />
        <div className="mx-4 mt-2 mb-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-edge-subtle bg-rail-navy">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5">
            <h1 className="text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-white">
              {title}
            </h1>
            {children ? (
              <div className="mt-5 max-w-2xl">{children}</div>
            ) : (
              <p className="mt-3 text-[12px] leading-relaxed text-tx-secondary">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
