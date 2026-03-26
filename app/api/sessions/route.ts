/**
 * GET  /api/sessions      – list all sessions
 * POST /api/sessions      – create a session  { title }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessions, createSession } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

// Node runtime – SQLite can NOT run on Edge
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sessions = getSessions(session.user.id);
    return NextResponse.json(sessions);
  } catch (err) {
    console.error("GET /api/sessions:", err);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sessionAuth = await getServerSession();
  if (!sessionAuth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title = "New Chat" } = (await req.json()) as { title?: string };
    const session = createSession(sessionAuth.user.id, title);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    console.error("POST /api/sessions:", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
