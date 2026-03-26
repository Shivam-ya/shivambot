"use client";

import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Download,
  Menu,
  Zap,
  Loader2,
  StopCircle,
  Sparkles,
  ImagePlus,
  X,
} from "lucide-react";
import MessageBubble, { type Message } from "./MessageBubble";
import Sidebar from "./Sidebar";
import AudioControls from "./AudioControls";
import { exportToDocx } from "@/lib/export-utils";
import type { ChatSession } from "@/lib/db";

// ── API helpers ────────────────────────────────────────────────────────────

async function apiGetSessions(): Promise<ChatSession[]> {
  const res = await fetch("/api/sessions");
  if (!res.ok) return [];
  return res.json();
}

async function apiCreateSession(title: string): Promise<ChatSession | null> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function apiDeleteSession(id: string): Promise<void> {
  await fetch(`/api/sessions/${id}`, { method: "DELETE" });
}

async function apiGetMessages(sessionId: string): Promise<Message[]> {
  const res = await fetch(`/api/sessions/${sessionId}`);
  if (!res.ok) return [];
  const rows = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((r: any) => ({
    id: r.id,
    role: r.role,
    content: r.content,
    model: r.model,
    createdAt: new Date(r.created_at),
  }));
}

async function apiSaveMessage(msg: {
  session_id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
}): Promise<void> {
  await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });
}

// ── Constants ──────────────────────────────────────────────────────────────

const WELCOME_MESSAGES = [
  "Ask me anything — I'm powered by the best open models.",
  "What shall we explore today?",
  "No gravity. No limits. Ask away.",
  "Your AI mission control is ready.",
];

let msgCounter = 0;
const mkId = () => `msg-${++msgCounter}-${Date.now()}`;

// ── Component ──────────────────────────────────────────────────────────────

export default function ChatWindow() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_MODEL ?? "openai/gpt-5.2"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Set random placeholder client-side only (avoids SSR hydration mismatch)
  useEffect(() => {
    setPlaceholder(WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]);
  }, []);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions from SQLite on mount
  useEffect(() => {
    apiGetSessions().then(setSessions);
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);

  // Switch session → load its messages from SQLite
  const handleSelectSession = useCallback(async (id: string) => {
    setActiveSessionId(id);
    const msgs = await apiGetMessages(id);
    setMessages(msgs);
  }, []);

  const handleNewSession = useCallback(async () => {
    const now = new Date();
    const title = `Chat ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const session = await apiCreateSession(title);
    if (!session) return;
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setMessages([]);
    setSelectedImage(null);
  }, []);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await apiDeleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
    },
    [activeSessionId]
  );

  const handleDeleteMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleExportThread = useCallback(async () => {
    const title =
      sessions.find((s) => s.id === activeSessionId)?.title ?? "SHIVAM Chatbot Chat";
    await exportToDocx(
      messages.map((m) => ({ role: m.role, content: m.content })),
      title
    );
  }, [messages, sessions, activeSessionId]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if ((!content.trim() && !selectedImage) || isLoading) return;

      // Create a session if none is active
      let sessionId = activeSessionId;
      if (!sessionId) {
        const title = content.slice(0, 40) + (content.length > 40 ? "…" : "");
        const session = await apiCreateSession(title);
        if (!session) return;
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        sessionId = session.id;
      }

      let finalContent = content.trim();
      if (selectedImage) {
        finalContent = `![Attached Image](${selectedImage})\n\n${finalContent}`;
      }

      const userMsg: Message = {
        id: mkId(),
        role: "user",
        content: finalContent,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSelectedImage(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      // Persist user message
      apiSaveMessage({ session_id: sessionId, role: "user", content: finalContent });

      setIsLoading(true);

      const assistantId = mkId();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        model: selectedModel,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      abortRef.current = new AbortController();

      let fullResponse = "";

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortRef.current.signal,
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: "user", content: finalContent },
            ],
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        setIsStreaming(true);
        setIsLoading(false);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: fullResponse } : m
                    )
                  );
                }
              } catch { /* skip */ }
            }
          }
        }

        // Persist completed assistant message
        if (fullResponse) {
          apiSaveMessage({
            session_id: sessionId,
            role: "assistant",
            content: fullResponse,
            model: selectedModel,
          });
        }
      } catch (error: unknown) {
        if ((error as Error).name !== "AbortError") {
          const errMsg = "⚠️ Something went wrong. Please check your API key and try again.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: errMsg } : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        setIsLoading(false);
      }
    },
    [isLoading, activeSessionId, messages, selectedModel]
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      await sendMessage(input);
    },
    [input, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  return (
    <div className="flex h-[100dvh] bg-space-950 overflow-hidden relative selection:bg-cyan-500/30">
      <div className="starfield" aria-hidden />

      <Sidebar
        sessions={sessions}
        activeSession={activeSessionId}
        onSelectSession={(id) => { setSidebarOpen(false); handleSelectSession(id); }}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="relative flex flex-col flex-1 min-w-0 h-full">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-space-950/60 backdrop-blur-xl z-10">
          <button
            id="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-8 h-8 glass-card rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
            aria-label="Open sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <h1 className="text-sm font-semibold text-white truncate">
              {sessions.find((s) => s.id === activeSessionId)?.title ?? "New Conversation"}
            </h1>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleExportThread}
              title="Export to Word"
              className="w-8 h-8 glass-card rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors"
              aria-label="Export conversation"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center py-20"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/20 flex items-center justify-center mb-6 shadow-cyan-glow">
                  <Sparkles className="w-7 h-7 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  SHIVAM<span className="gradient-text"> Chatbot</span>
                </h2>
                <p className="text-slate-500 text-sm max-w-xs">{placeholder}</p>
                <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-sm">
                  {[
                    "Explain quantum computing",
                    "Write a Python web scraper",
                    "Debug my React component",
                    "Summarize a research paper",
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => sendMessage(chip)}
                      className="px-3 py-1.5 rounded-full glass-card border border-white/08 hover:border-cyan-400/30 text-slate-400 hover:text-cyan-400 text-xs transition-all"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                  onDelete={handleDeleteMessage}
                />
              ))
            )}
          </AnimatePresence>
          <div ref={bottomRef} className="h-6 flex-shrink-0" />
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/[0.06] bg-space-950/60 backdrop-blur-xl">
          <AnimatePresence>
            {selectedImage && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-4xl mx-auto mb-3 relative inline-block"
              >
                <img src={selectedImage} alt="Selected" className="h-24 w-auto rounded-xl border border-slate-200 dark:border-white/20 shadow-lg object-cover" />
                <button 
                  type="button" 
                  onClick={() => setSelectedImage(null)} 
                  className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1.5 shadow-md hover:bg-red-500 transition-colors"
                >
                  <X className="w-3 h-3"/>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 max-w-4xl mx-auto p-1.5 transition-all bg-white dark:bg-space-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-glass focus-within:ring-2 focus-within:ring-cyan-500/30 focus-within:border-cyan-500/50"
          >
            <div className="flex-shrink-0 pl-1 pb-1 flex items-center gap-1">
              <input type="file" accept="image/*" id="image-upload" className="hidden" onChange={handleImageSelect} />
              <label htmlFor="image-upload" className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-cyan-500 cursor-pointer transition-all">
                <ImagePlus className="w-5 h-5 flex-shrink-0" />
              </label>
              <AudioControls
                onTranscript={(text) => {
                  setInput((prev) => (prev ? `${prev} ${text}` : text));
                  textareaRef.current?.focus();
                }}
              />
            </div>
            
            <textarea
              ref={textareaRef}
              id="chat-input"
              value={input}
              onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything...."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent border-none outline-none focus:ring-0 px-2 py-2.5 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50"
              style={{ minHeight: "44px" }}
            />
            
            <div className="flex-shrink-0 pr-1 pb-1 flex items-center">
              {isStreaming ? (
                <motion.button
                  type="button"
                  onClick={stopStreaming}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:border dark:border-red-500/30 dark:text-red-400 transition-all flex items-center justify-center m-auto"
                  aria-label="Stop generation"
                >
                  <StopCircle className="w-5 h-5 flex-shrink-0" />
                </motion.button>
              ) : (
                <motion.button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-space-950 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all m-auto"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  ) : (
                    <Send className="w-4 h-4 translate-x-0.5 flex-shrink-0" />
                  )}
                </motion.button>
              )}
            </div>
          </form>
          <p className="text-center text-[10px] text-slate-700 mt-2">
            SHIVAM Chatbot may make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
