import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-5.2",
      messages: [{ role: "user", content: "hi" }]
    })
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
testGroq();
