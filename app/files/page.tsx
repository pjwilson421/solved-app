import { Suspense } from "react";
import { FilesClient } from "@/components/files/FilesClient";

function FilesFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-base text-sm text-tx-muted">
      Loading…
    </div>
  );
}

export default function FilesPage() {
  return (
    <Suspense fallback={<FilesFallback />}>
      <FilesClient />
    </Suspense>
  );
}
