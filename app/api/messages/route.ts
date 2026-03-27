import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { saveMessage } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const msg = await req.json();
  const saved = saveMessage(msg);
  return NextResponse.json(saved);
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}