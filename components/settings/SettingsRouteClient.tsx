"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Header } from "@/components/create-image/Header";
import { Sidebar } from "@/components/create-image/Sidebar";
import { MobileCreateImageDrawer } from "@/components/create-image/MobileCreateImageDrawer";
import type { HistoryItem } from "@/components/create-image/types";
import { useShellNav } from "@/lib/use-shell-nav";

const EMPTY_HISTORY: HistoryItem[] = [];

type SettingsRouteClientProps = {
  title: string;
  description?: string;
};

export function SettingsRouteClient({
  title,
  description = "This section will be available in a future update.",
}: SettingsRouteClientProps) {
  const { navigate, activeMainNav } = useShellNav();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex h-dvh min-h-0 flex-col overflow-hidden bg-[#0F0F10] text-[#FAFAFA]",
        "md:[--create-image-prompt-max:900px] xl:[--create-image-prompt-max:1000px]",
      )}
    >
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden md:flex">
        <div className="hidden shrink-0 xl:block">
          <Header variant="desktop" />
        </div>
        <div className="shrink-0 xl:hidden">
          <Header
            variant="mobile"
            mobileTitle="SETTINGS"
            onMenuClick={() => setMobileMenuOpen(true)}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden xl:grid xl:grid-cols-[300px_minmax(0,1fr)]">
          <Sidebar
            className="hidden shrink-0 xl:flex xl:w-[300px] xl:min-w-[300px]"
            activeId={activeMainNav}
            onNavigate={navigate}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 pt-6 md:px-8 xl:px-10 xl:pb-6">
            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-[#2A2A2E] bg-[#141418]",
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-6">
                <h1 className="text-left text-[13px] font-semibold uppercase tracking-[0.08em] text-white">
                  {title}
                </h1>
                <p className="mt-4 max-w-lg text-[13px] leading-relaxed text-[#A1A1AA]">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0F0F10] md:hidden">
        <Header
          variant="mobile"
          mobileTitle="SETTINGS"
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <div className="mx-4 mt-2 mb-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-[#2A2A2E] bg-[#141418]">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5">
            <h1 className="text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-white">
              {title}
            </h1>
            <p className="mt-3 text-[12px] leading-relaxed text-[#A1A1AA]">
              {description}
            </p>
          </div>
        </div>
      </div>

      <MobileCreateImageDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        historyItems={EMPTY_HISTORY}
        activeHistoryId={null}
        onSelectHistory={() => {}}
        onHistoryMenuAction={() => {}}
        activeMainNav={activeMainNav}
      />
    </div>
  );
}
