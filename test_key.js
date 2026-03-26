const OpenAI = require("openai");

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "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",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "SHIVAM Chatbot",
  },
});

async function main() {
  try {
    const response = await client.chat.completions.create({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [{ role: "user", content: "Hello" }],
    });
    console.log("SUCCESS");
    console.log(response.choices[0].message);
  } catch(e) {
    console.error("ERROR", e.status, e.message);
  }
}
main();
