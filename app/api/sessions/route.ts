export async function GET() {
  return Response.json({
    sessions: []
  });
}

export async function POST() {
  return Response.json({
    success: true
  });
}