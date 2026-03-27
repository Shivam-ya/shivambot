import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Types ─────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  created_at: string;
}

// ── Database helpers ────────────────────────────────────────────────────────

// -- Users --
export async function createUser(email: string, passwordHash: string): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .insert({ email, password_hash: passwordHash })
    .select()
    .single();
  if (error) { 
    console.error("createUser error:", error); 
    throw new Error(error.message); 
  }
  return data;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();
  if (error && error.code !== 'PGRST116') { console.error("getUserByEmail:", error); return null; }
  return data || null;
}

// -- Sessions --
export async function createSession(userId: string, title: string): Promise<ChatSession | null> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) { console.error("createSession:", error); return null; }
  return data;
}

export async function getSessions(userId: string): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) { console.error("getSessions:", error); return []; }
  return data ?? [];
}

export async function deleteSession(id: string, userId: string): Promise<void> {
  // Only delete if it belongs to the user
  const { data } = await supabase.from("chat_sessions").select("id").eq("id", id).eq("user_id", userId).single();
  if (!data) return;

  await supabase.from("chat_messages").delete().eq("session_id", id);
  await supabase.from("chat_sessions").delete().eq("id", id);
}

export async function touchSession(id: string): Promise<void> {
  await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", id);
}

// -- Messages --
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
  
  // Touch session
  await touchSession(msg.session_id);
  
  return data;
}

export async function deleteMessage(id: string): Promise<void> {
  await supabase.from("chat_messages").delete().eq("id", id);
}
