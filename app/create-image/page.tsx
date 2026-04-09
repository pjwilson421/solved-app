import { Suspense } from "react";
import { CreateImageClient } from "@/components/create-image/CreateImageClient";

function CreateImageFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-base text-sm text-tx-muted">
      Loading…
    </div>
  );
}

export default function CreateImagePage() {
  return (
    <Suspense fallback={<CreateImageFallback />}>
      <CreateImageClient />
    </Suspense>
  );
}
