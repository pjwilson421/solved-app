import { Suspense } from "react";
import { FilesClient } from "@/components/files/FilesClient";

function FilesFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-app-canvas text-sm text-[#A1A1AA]">
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
