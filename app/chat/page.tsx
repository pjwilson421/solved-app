import { Suspense } from "react";
import { ChatClient } from "@/components/chat/ChatClient";

function ChatFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-base text-sm text-tx-muted">
      Loading…
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatFallback />}>
      <ChatClient />
    </Suspense>
  );
}
