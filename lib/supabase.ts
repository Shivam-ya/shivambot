import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our data model
export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  model?: string;
}

// Database helpers
export async function createSession(title: string): Promise<ChatSession | null> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ title })
    .select()
    .single();
  if (error) { console.error("createSession:", error); return null; }
  return data;
}

export async function getSessions(): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) { console.error("getSessions:", error); return []; }
  return data ?? [];
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) { console.error("getMessages:", error); return []; }
  return data ?? [];
}

export async function saveMessage(msg: Omit<ChatMessage, "id" | "created_at">): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert(msg)
    .select()
    .single();
  if (error) { console.error("saveMessage:", error); return null; }
  return data;
}

export async function deleteSession(id: string): Promise<void> {
  await supabase.from("chat_messages").delete().eq("session_id", id);
  await supabase.from("chat_sessions").delete().eq("id", id);
}
