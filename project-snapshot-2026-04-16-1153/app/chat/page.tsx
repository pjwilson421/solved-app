import { ChatClient } from "@/components/chat/ChatClient";

type SearchParams = {
  openChat?: string | string[];
  new?: string | string[];
};

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const initialOpenChatId = firstParam(params.openChat);
  const initialCreateNew = firstParam(params.new) === "1";

  return (
    <ChatClient
      initialOpenChatId={initialOpenChatId}
      initialCreateNew={initialCreateNew}
    />
  );
}
