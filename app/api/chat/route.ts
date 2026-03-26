import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getServerSession } from "@/lib/auth";

export const runtime = "nodejs";

export interface ChatRequestBody {
  messages: Array<{ role: string; content: string }>;
  model?: string;
}

// Helper to seamlessly unpack Markdown base64 back into OpenAI Vision Array format
function parseMultimodalContent(content: string) {
  const imageRegex = /!\[.*?\]\((data:image\/[^;]+;base64,[^\)]+)\)/g;
  
  // If there are no images, ALWAYS return just the plain string
  if (!content.match(imageRegex)) {
    return content;
  }

  let match;
  const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  let lastIndex = 0;

  while ((match = imageRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "image_url", image_url: { url: match[1] } });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }

  return parts;
}

export async function POST(req: NextRequest) {
  const sessionAuth = await getServerSession();
  if (!sessionAuth?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = (await req.json()) as ChatRequestBody;
    const {
      messages,
      model = process.env.NEXT_PUBLIC_DEFAULT_MODEL ??
        "meta-llama/llama-3.1-8b-instruct:free",
    } = body;

    if (!messages || messages.length === 0) {
      return new Response("No messages provided", { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response("OpenRouter API key not configured", { status: 500 });
    }

    // Official OpenAI SDK client pointed at OpenRouter
    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "SHIVAM Chatbot",
      },
    });

    const formattedMessages = messages.map((msg) => ({
      ...msg,
      content: parseMultimodalContent(msg.content),
    }));

    const SYSTEM_PROMPT = `You are SHIVAM, an advanced AI chatbot. 
IMPORTANT FORMATTING RULES:
1. When writing math equations, ALWAYS use standard markdown math delimiters: '$' for inline math and '$$' for block math. NEVER use parentheses like '\\(' or '\\[' for math.
2. When creating tables, ALWAYS follow strict GitHub Flavored Markdown (GFM) table syntax. A table MUST start with a header row, followed by a separator row (e.g., |---|---|), and then the data rows.`;

    const finalMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...formattedMessages
    ];

    // Define our hyper-reliable free fallback models for when OpenRouter limits are hit
    const fallbackChain = [
      model,
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.1-8b-instruct:free",
      "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
      "mistralai/mistral-7b-instruct:free",
      "huggingfaceh4/zephyr-7b-beta:free",
    ];

    let stream: any = null;
    let fallbackError: any = null;

    // Progressive fallback circuit breaker
    for (const fallbackModel of fallbackChain) {
      if (!fallbackModel) continue; // Skip identical or undefined
      
      try {
        stream = await client.chat.completions.create({
          model: fallbackModel,
          messages: finalMessages as unknown as OpenAI.Chat.ChatCompletionMessageParam[],
          stream: true,
          temperature: 0.7,
          max_tokens: 4096,
        });
        // Success! We hit a working model
        break;
      } catch (err: any) {
        console.warn(`Fallback triggered: Model ${fallbackModel} failed with ${err?.status || err?.message}`);
        fallbackError = err;
        
        // If it's a 401 Unauthorized (invalid API key entirely), do NOT fallback, just fail
        if (err?.status === 401) {
          throw err;
        }
        // Otherwise (429 rate limit, 404 removed, 502 gateway), loop to the next model!
      }
    }

    if (!stream) {
      // If we exhausted all fallbacks and STILL failed, throw the last error
      throw fallbackError || new Error("All fallback endpoints failed.");
    }

    // Pipe the SDK async iterable → SSE Response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
            );
          }
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } finally {
        try {
          await writer.close();
        } catch (e) {
          // Ignore: stream already closed by client termination
        }
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat route error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
