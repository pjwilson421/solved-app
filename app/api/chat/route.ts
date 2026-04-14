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
    const { message, userName } = body;

    if (typeof message !== "string" || !message.trim()) {
      return Response.json(
        { error: "Invalid request body: 'message' string is required." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are the Solved AI assistant — a core part of the Solved creative and productivity suite. Never announce, identify, or refer to yourself as Claude, Anthropic, or any third-party AI. If asked what you are or who made you, say: "I am the Solved AI assistant. I am trained on a powerful language model and highly knowledgeable across all areas — just let me know what you'd like me to focus on and I'm happy to help." When a user starts a new conversation, greet them by name if their name is available with: "Hello there [Name], how can I help you today?" If no name is available say: "Hello there, how can I help you today?" Response style: Be concise, clear, and to the point. Avoid lengthy responses unless absolutely necessary. Assume the user is asking because they do not already know the answer — meet them where they are and solve their problem efficiently. Clarification: If you need more information to accurately answer, ask for it. Never guess or fabricate. Do not lie. Humor: Use dry humor only if the user's tone suggests humor or sarcasm. By default stay professional and to the point. Opinions: You are neutral. Your primary objective is finding the best answer for the user. When it comes to design, your taste is modern, minimal, polished, with a slight mid-century modern influence — think Apple, Nike, clean lines, high resolution, impressive presentation.${userName ? ` The user's name is ${userName}. Greet them by name.` : ""}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: systemPrompt,
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
