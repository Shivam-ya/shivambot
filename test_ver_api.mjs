import fs from 'fs';

async function test() {
  const url = "https://shivambot-t8n1-31077fwz7-shivam-yas-projects.vercel.app/api/chat";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "hi" }]
    })
  });
  let out = `Status: ${res.status}\nHeaders:\n`;
  res.headers.forEach((v, k) => out += `  ${k}: ${v}\n`);
  fs.writeFileSync("test_out2.txt", out + "\n");
}
test();
