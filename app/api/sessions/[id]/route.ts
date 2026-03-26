/**
 * DELETE /api/sessions/[id]   – delete a session (cascades messages)
 * GET    /api/sessions/[id]/messages – get all messages for a session
 */
import { NextRequest, NextResponse } from "next/server";
import { deleteSession, getMessages } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionAuth = await getServerSession();
  if (!sessionAuth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    deleteSession(resolvedParams.id, sessionAuth.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/sessions/[id]:", err);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionAuth = await getServerSession();
  if (!sessionAuth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const messages = getMessages(resolvedParams.id);
    return NextResponse.json(messages);
  } catch (err) {
    console.error("GET /api/sessions/[id]:", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
