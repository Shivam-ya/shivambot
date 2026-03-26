import ChatWindow from "@/components/ChatWindow";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat – SHIVAM Chatbot",
  description: "Start a conversation with the most powerful open AI models.",
};

export default async function ChatPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <ChatWindow />;
}
