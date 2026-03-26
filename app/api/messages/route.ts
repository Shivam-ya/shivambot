export async function GET() {
  return new Response(
    JSON.stringify({ messages: [] }),
    { status: 200 }
  );
}