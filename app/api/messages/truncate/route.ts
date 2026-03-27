import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id, message_id } = await req.json();
  
  if (!session_id || !message_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Defend against client-server clock skew by explicitly querying the DB for the true creation time
  const { data: msgData, error: msgError } = await supabase
    .from("chat_messages")
    .select("created_at")
    .eq("id", message_id)
    .single();

  if (msgError || !msgData) {
    // If the message is somehow not in the DB, gracefully fail and say true (it's already invisible or fake)
    return NextResponse.json({ success: true, warning: "Message not found in DB" });
  }

  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("session_id", session_id)
    .gte("created_at", msgData.created_at);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
