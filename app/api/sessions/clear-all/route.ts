import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { deleteAllSessions } from "@/lib/supabase";

export async function DELETE() {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await deleteAllSessions(session.user.id);
  return NextResponse.json({ success: true });
}
