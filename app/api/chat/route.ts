import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY environment variable is not set" },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  try {
    const body = await request.json();
    const { message } = body;

    if (typeof message !== "string" || !message.trim()) {
      return Response.json(
        { error: "Invalid request body: 'message' string is required." },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: message }],
    });

    const assistantText = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    return Response.json({ text: assistantText });
  } catch (error: any) {
    console.error("Anthropic API error:", error);
    return Response.json(
      { error: error?.message || "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
