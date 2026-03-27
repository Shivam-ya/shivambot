import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { createSession, getSessions } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await getSessions(session.user.id);
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title } = await req.json();
  const newSession = await createSession(session.user.id, title || "New Chat");
  return NextResponse.json(newSession);
}