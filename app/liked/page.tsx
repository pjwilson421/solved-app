import { Suspense } from "react";
import { HistoryClient } from "@/components/history/HistoryClient";

function LikedFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-app-bg text-sm text-tx-secondary">
      Loading…
    </div>
  );
}

export default function LikedPage() {
  return (
    <Suspense fallback={<LikedFallback />}>
      <HistoryClient page="liked" />
    </Suspense>
  );
}
