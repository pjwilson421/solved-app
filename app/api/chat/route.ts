import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-3-5-sonnet-latest";
const MAX_TOKENS = 1000;

function extractAssistantText(response: {
  content: Array<{ type: string; text?: string }>;
}): string {
  const parts: string[] = [];
  for (const block of response.content) {
    if (block.type === "text" && "text" in block && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  return parts.join("").trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    console.error("[api/chat] Missing ANTHROPIC_API_KEY");
    return Response.json(
      { error: "Chat is not configured on the server." },
      { status: 500 },
    );
  }

  let message: string;
  try {
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as { message?: unknown }).message !== "string"
    ) {
      return Response.json({ error: "Invalid body: expected { message: string }" }, { status: 400 });
    }
    message = (body as { message: string }).message;
  } catch (e) {
    console.error("[api/chat] Failed to parse JSON body", e);
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return Response.json({ error: "Message is empty" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system:
        "You are a helpful assistant. The user message may contain a labeled conversation transcript (User:/Assistant:). Use it for context and respond as the assistant to the latest user need.",
      messages: [{ role: "user", content: trimmed }],
    });

    const text = extractAssistantText(response);
    return Response.json({ text });
  } catch (e) {
    console.error("[api/chat] Anthropic request failed", e);
    return Response.json(
      { error: "The assistant could not complete this request." },
      { status: 500 },
    );
  }
}
