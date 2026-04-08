import { Suspense } from "react";
import { CreateImageClient } from "@/components/create-image/CreateImageClient";

function CreateImageFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-app-canvas text-sm text-[#A1A1AA]">
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
