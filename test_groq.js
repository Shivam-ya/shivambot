const OpenAI = require("openai");

const client = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

async function main() {
  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "Hello" }],
    });
    console.log("GROQ SUCCESS");
    console.log(response.choices[0].message);
  } catch(e) {
    console.error("GROQ ERROR", e.status, e.message);
  }
}
main();
