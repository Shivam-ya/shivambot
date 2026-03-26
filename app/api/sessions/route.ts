export async function GET() {
  return new Response(
    JSON.stringify({ sessions: [] }),
    { status: 200 }
  );
}

export async function POST() {
  return new Response(
    JSON.stringify({ success: true }),
    { status: 200 }
  );
}