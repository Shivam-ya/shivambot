export async function POST() {
  return new Response(
    JSON.stringify({
      reply: "Hello! Chat is working ✅"
    }),
    { status: 200 }
  );
}