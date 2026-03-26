export async function GET() {
  return new Response(
    JSON.stringify({ sessions: [] }),
    { status: 200 }
  );
}