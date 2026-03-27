import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getMessages, deleteSession } from "@/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const messages = await getMessages(id);
  return NextResponse.json(messages);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deleteSession(id, session.user.id);
  return NextResponse.json({ success: true });
}