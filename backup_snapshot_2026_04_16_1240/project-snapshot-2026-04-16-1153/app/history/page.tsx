import { Suspense } from "react";
import { HistoryClient } from "@/components/history/HistoryClient";

function HistoryFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-app-bg text-sm text-tx-muted">
      Loading…
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistoryFallback />}>
      <HistoryClient />
    </Suspense>
  );
}
