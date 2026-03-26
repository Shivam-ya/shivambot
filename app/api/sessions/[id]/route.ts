export async function GET() {
  return new Response(
    JSON.stringify({ success: true }),
    { status: 200 }
  );
}