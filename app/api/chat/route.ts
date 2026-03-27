import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { model, messages } = await req.json();

    let targetModel = model || "llama-3.3-70b-versatile";
    let apiUrl = "https://api.groq.com/openai/v1/chat/completions";
    let apiAuthKey = process.env.GROQ_API_KEY;

    if (targetModel === "gemma2-9b-it") {
       targetModel = "google/gemma-2-9b-it";
       apiUrl = "https://openrouter.ai/api/v1/chat/completions";
       apiAuthKey = process.env.OPENROUTER_API_KEY;
    } else if (targetModel === "mixtral-8x7b-32768") {
       targetModel = "mistralai/mixtral-8x7b-instruct";
       apiUrl = "https://openrouter.ai/api/v1/chat/completions";
       apiAuthKey = process.env.OPENROUTER_API_KEY;
    }

    if (!apiAuthKey) {
      return NextResponse.json({ error: "API Key missing for the selected model provider." }, { status: 500 });
    }

    let hasImage = false;

    // Process messages to handle base64 markdown images
    const processedMessages = messages.filter((m: any) => m.role !== "system").map((m: any) => {
      if (typeof m.content === "string") {
        const imageMatch = m.content.match(/!\[.*?\]\((data:image\/[^;]+;base64,[^)]+)\)/);
        if (imageMatch) {
          hasImage = true;
          const imageUrl = imageMatch[1];
          const textContent = m.content.replace(imageMatch[0], "").trim();
          
          return {
            role: m.role,
            content: [
              { type: "text", text: textContent || "Describe this image." },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          };
        }
      }
      return m;
    });

    if (hasImage && !targetModel.includes("vision")) {
      targetModel = "llama-3.2-11b-vision-preview"; // Auto-switch to Groq's vision model
      apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      apiAuthKey = process.env.GROQ_API_KEY;
    }

    // Call the respective provider (OpenAI compatible)
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiAuthKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: "system", content: "You are an AI assistant. If anyone asks who built, made, manufactured, or created you, you must answer exactly 'SHIVAM' and nothing else. No other names." },
          ...processedMessages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Decode with { stream: true } to handle split multibyte characters
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split("\n");
          // The last element is inherently the incomplete portion of the stream
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6);
              if (dataStr === "[DONE]") {
                controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const json = JSON.parse(dataStr);
                const content = json.choices?.[0]?.delta?.content || "";
                if (content) {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch { /* skip incomplete chunks */ }
            }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}