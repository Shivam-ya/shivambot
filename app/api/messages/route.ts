/**
 * POST /api/messages  – save a message { session_id, role, content, model? }
 */
import { NextRequest, NextResponse } from "next/server";
import { saveMessage } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sessionAuth = await getServerSession();
  if (!sessionAuth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { session_id, role, content, model } = body as {
      session_id: string;
      role: "user" | "assistant";
      content: string;
      model?: string;
    };

    if (!session_id || !role || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const message = saveMessage({ session_id, role, content, model });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("POST /api/messages:", err);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
