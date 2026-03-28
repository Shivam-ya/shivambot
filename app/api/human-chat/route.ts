import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getHumanConversation, getHumanMessages, saveHumanMessage } from "@/lib/supabase";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let conversation;
  try {
    conversation = await getHumanConversation(session.user.id);
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to load human conversation", details: e.message || String(e) }, { status: 500 });
  }

  if (!conversation) {
    return NextResponse.json({ error: "Failed to load human conversation" }, { status: 500 });
  }

  const messages = await getHumanMessages(conversation.id);
  
  return NextResponse.json({ conversation, messages });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversation_id, sender_id, message } = await req.json();
  if (!conversation_id || !sender_id || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const newMsg = await saveHumanMessage({
    conversation_id,
    sender_id,
    message
  });

  return NextResponse.json(newMsg);
}
