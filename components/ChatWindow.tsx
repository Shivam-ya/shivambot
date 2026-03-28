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
import type { ChatSession } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

// ── API helpers ────────────────────────────────────────────────────────────

async function apiGetSessions(): Promise<ChatSession[]> {
  const res = await fetch("/api/sessions");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.sessions || []);
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
}): Promise<any> {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Constants ──────────────────────────────────────────────────────────────

const WELCOME_MESSAGES = [
  "Ask me anything — I'm powered by the best open models.",
  "What shall we explore today?",
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
  const [selectedModel, setSelectedModel] = useState(() => {
    const envModel = process.env.NEXT_PUBLIC_DEFAULT_MODEL;
    return (envModel && !envModel.includes('/')) ? envModel : "llama-3.3-70b-versatile";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Human Chat State
  const [chatMode, setChatMode] = useState<"ai" | "human">("ai");
  const [deviceId, setDeviceId] = useState("");
  const [humanMessages, setHumanMessages] = useState<Message[]>([]);
  const [humanConversationId, setHumanConversationId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem("device_id");
    if (!id) {
      id = "device_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem("device_id", id);
    }
    setDeviceId(id);
  }, []);

  // Fetch human chat messages
  useEffect(() => {
    if (chatMode !== "human") return;
    fetch("/api/human-chat")
      .then((res) => res.json())
      .then((data) => {
        if (data.conversation?.id) {
          setHumanConversationId(data.conversation.id);
        }
        if (data.messages) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setHumanMessages(data.messages.map((m: any) => ({
            id: m.id,
            role: "user",
            content: m.message,
            createdAt: new Date(m.created_at),
            isHumanMode: true,
            senderId: m.sender_id,
          })));
        }
      })
      .catch(console.error);
  }, [chatMode]);

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

  // Poll server health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/health");
        setIsOnline(res.ok);
      } catch (e) {
        setIsOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Lazy load Puter.js safely without duplication
  useEffect(() => {
    if (document.getElementById("puter-js") || (window as any).puter) return;
    const script = document.createElement("script");
    script.id = "puter-js";
    script.src = "https://js.puter.com/v2/";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" });
  }, [messages, isStreaming]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);
  // Real-time synchronization for AI chat multi-device support
  useEffect(() => {
    if (!activeSessionId || !isOnline || chatMode === "human") return;

    const channel = supabase
      .channel(`realtime-ai-${activeSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${activeSessionId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            // Prevent duplicating messages we just sent locally
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            
            return [...prev, {
              id: newMsg.id,
              role: newMsg.role as "user" | "assistant",
              content: newMsg.content,
              model: newMsg.model,
              createdAt: new Date(newMsg.created_at || Date.now()),
            }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSessionId, isOnline, chatMode]);

  // Real-time synchronization for Human chat multi-device support
  useEffect(() => {
    if (chatMode !== "human" || !humanConversationId || !isOnline) return;

    const channel = supabase
      .channel(`realtime-human-${humanConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages',
          filter: `conversation_id=eq.${humanConversationId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          setHumanMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              role: "user",
              content: newMsg.message,
              createdAt: new Date(newMsg.created_at || Date.now()),
              isHumanMode: true,
              senderId: newMsg.sender_id,
            }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatMode, humanConversationId, isOnline]);

  // Switch session → load its messages from SQLite
  const handleSelectSession = useCallback(async (id: string) => {
    setActiveSessionId(id);
    const msgs = await apiGetMessages(id);
    setMessages(msgs);
  }, []);

  const handleNewSession = useCallback(async () => {
    const title = "SHIVAM Chatbot";
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

  const handleClearAllSessions = useCallback(async () => {
    if (!confirm("Are you sure you want to permanently delete all chat history? This action cannot be undone.")) return;
    await fetch("/api/sessions/clear-all", { method: "DELETE" });
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
  }, []);

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
      const finalContent = content.trim();
      if (!finalContent && !selectedImage) return;

      if (chatMode === "human") {
        if (!humanConversationId) {
          alert("Human Chat tables are missing! Please run the SQL command provided in the walkthrough in your Supabase Dashboard to enable Human Chat.");
          return;
        }
        const msg: Message = {
          id: mkId(),
          role: "user",
          content: finalContent,
          createdAt: new Date(),
          isHumanMode: true,
          senderId: deviceId,
        };
        
        setHumanMessages(prev => [...prev, msg]);
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        
        fetch("/api/human-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: humanConversationId,
            sender_id: deviceId,
            message: finalContent,
          })
        }).then(res => res.json()).then(saved => {
          if (saved.id) {
            setHumanMessages((current) => current.map((m) => 
              m.id === msg.id ? { ...m, id: saved.id, createdAt: new Date(saved.created_at) } : m
            ));
          }
        });
        return;
      }

      const lowerContent = finalContent.toLowerCase();

      const imageRegex = /^(?:\/image|image|generate(?:\s+(?:an?|the))?\s+image|create(?:\s+(?:an?|the))?\s+image)/i;
      const match = lowerContent.match(imageRegex);

      if (match) {
        let imagePrompt = finalContent.substring(match[0].length).trim();
        if (imagePrompt.toLowerCase().startsWith("of ")) {
          imagePrompt = imagePrompt.substring(3).trim();
        }
        
        const userMsg: Message = {
          id: mkId(),
          role: "user",
          content: finalContent,
          createdAt: new Date(),
        };
        const assistantId = mkId();
        if (!imagePrompt) {
          const userMsgEmpty: Message = { id: mkId(), role: "user", content: finalContent, createdAt: new Date() };
          const assistantMsgEmpty: Message = { id: mkId(), role: "assistant", content: "Please provide a valid prompt", model: "FLUX.1 Schnell", createdAt: new Date() };
          setMessages((prev) => [...prev, userMsgEmpty, assistantMsgEmpty]);
          setInput("");
          if (textareaRef.current) textareaRef.current.style.height = "auto";
          return;
        }

        const assistantMsg: Message = {
          id: assistantId,
          role: "assistant",
          content: "Generating image...",
          model: "FLUX.1 Schnell",
          createdAt: new Date(),
          isLoadingImage: true,
        };
        
        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        setInput("");
        setSelectedImage(null);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        setIsLoading(true);

        try {
          const response = await fetch("/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: imagePrompt }),
          });

          if (!response.ok) {
            let errorMsg = "Unable to generate image";
            try {
              const errData = await response.json();
              if (errData.error) errorMsg = `Unable to generate image: ${errData.error}`;
            } catch (e) {
              // Ignore json parsing error
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isLoadingImage: false, content: errorMsg } : m
              )
            );
            setIsLoading(false);
            return;
          }

          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isLoadingImage: false, content: "", imageUrl: imageUrl } : m
            )
          );
        } catch (error) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isLoadingImage: false, content: "Image generation failed" } : m
            )
          );
        } finally {
          setIsLoading(false);
        }
        return;
      }

      if ((!content.trim() && !selectedImage) || isLoading) return;

      // Create a session if none is active
      let sessionId = activeSessionId;
      if (!sessionId) {
        const title = content.slice(0, 40) + (content.length > 40 ? "…" : "");
        const session = await apiCreateSession(title);
        if (!session) {
          // Fallback to local offline session memory if Supabase is disconnected (.env.local missing credentials)
          console.warn("Using offline local session fallback (database connection failed).");
          sessionId = "offline-session-" + Date.now();
          setSessions((prev) => [{ id: sessionId, title: "Offline Session", created_at: new Date() } as unknown as ChatSession, ...prev]);
          setActiveSessionId(sessionId);
        } else {
          setSessions((prev) => [session, ...prev]);
          setActiveSessionId(session.id);
          sessionId = session.id;
        }
      }

      let contentToSave = content.trim();
      if (selectedImage) {
        contentToSave = `![Attached Image](${selectedImage})\n\n${contentToSave}`;
      }

      const userMsg: Message = {
        id: mkId(),
        role: "user",
        content: contentToSave,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSelectedImage(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      // Persist user message and update local state with DB ID
      apiSaveMessage({ session_id: sessionId, role: "user", content: contentToSave }).then((savedMsg) => {
        if (savedMsg?.id) {
          setMessages((current) => current.map((m) => m.id === userMsg.id ? { ...m, id: savedMsg.id, createdAt: new Date(savedMsg.created_at) } : m));
        }
      });

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

        if (!response.ok) {
          let errorText = `HTTP ${response.status}`;
          try {
            const errData = await response.json();
            if (errData.error) errorText = errData.error;
          } catch(e) {}
          throw new Error(errorText);
        }

        setIsStreaming(true);
        setIsLoading(false);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
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

        // Persist completed assistant message and update local state with DB ID
        if (fullResponse) {
          apiSaveMessage({
            session_id: sessionId,
            role: "assistant",
            content: fullResponse,
            model: selectedModel,
          }).then((savedMsg) => {
            if (savedMsg?.id) {
              setMessages((current) => current.map((m) => m.id === assistantId ? { ...m, id: savedMsg.id, createdAt: new Date(savedMsg.created_at) } : m));
            }
          });
        }
      } catch (error: unknown) {
        if ((error as Error).name !== "AbortError") {
          const errMsg = `⚠️ Something went wrong: ${(error as Error).message || "Please check your API key and try again."}`;
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
    [isLoading, activeSessionId, messages, selectedModel, chatMode, humanConversationId, deviceId, humanMessages]
  );

  const handleEditMessage = useCallback(async (id: string, newContent: string) => {
    const msgIndex = messages.findIndex((m) => m.id === id);
    if (msgIndex === -1) return;

    if (activeSessionId) {
      await fetch("/api/messages/truncate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: activeSessionId, message_id: id })
      });
    }

    setMessages(messages.slice(0, msgIndex));
    await sendMessage(newContent);
  }, [messages, activeSessionId, sendMessage]);

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
        onClearAllSessions={handleClearAllSessions}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        chatMode={chatMode}
        onChatModeChange={setChatMode}
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
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              }`}
              title={isOnline ? "Server Online" : "Server Offline"}
            />
            <h1 className="text-sm font-semibold text-white truncate">
              {chatMode === "human" 
                ? "Secure Human Chat (Multi-Device)"
                : Array.isArray(sessions) 
                  ? sessions.find((s) => s.id === activeSessionId)?.title ?? "New Conversation" 
                  : "New Conversation"
              }
            </h1>
          </div>
          {chatMode === "ai" && messages.length > 0 && (
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
            {(chatMode === "human" ? humanMessages : messages).length === 0 ? (
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
                  {chatMode === "human" ? "Human Chat Active" : <>SHIVAM<span className="gradient-text"> Chatbot</span></>}
                </h2>
                <p className="text-slate-500 text-sm max-w-xs">{chatMode === "human" ? "Messages sent here will instantly appear on your other devices!" : placeholder}</p>
                
                {chatMode === "ai" && (
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
                )}
              </motion.div>
            ) : (
              (chatMode === "human" ? humanMessages : messages).map((msg, i, arr) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={chatMode === "ai" && isStreaming && i === arr.length - 1 && msg.role === "assistant"}
                  onDelete={chatMode === "ai" ? handleDeleteMessage : undefined}
                  onEdit={chatMode === "ai" ? handleEditMessage : undefined}
                  myDeviceId={deviceId}
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
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors z-10"
                >
                  <X className="w-3 h-3"/>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 max-w-4xl mx-auto p-1.5 transition-all bg-[var(--input-bg)] border border-[var(--input-border)] rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-cyan-500/30 focus-within:border-cyan-500/50"
          >
            <div className="flex-shrink-0 pl-1 pb-1 flex items-center gap-1">
              <input type="file" accept="image/*" id="image-upload" className="hidden" onChange={handleImageSelect} />
              <label htmlFor="image-upload" className="w-10 h-10 rounded-xl hover:bg-[var(--bg-card-hover)] flex items-center justify-center text-[var(--text-muted)] hover:text-cyan-500 cursor-pointer transition-all">
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
              className="flex-1 resize-none bg-transparent border-none outline-none focus:ring-0 px-2 py-2.5 text-base sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] disabled:opacity-50"
              style={{ minHeight: "44px" }}
            />
            
            <div className="flex-shrink-0 pr-1 pb-1 flex items-center">
              {isStreaming ? (
                <motion.button
                  type="button"
                  onClick={stopStreaming}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center m-auto"
                  aria-label="Stop generation"
                >
                  <StopCircle className="w-5 h-5 flex-shrink-0" />
                </motion.button>
              ) : (
                <motion.button
                  type="submit"
                  disabled={(!input.trim() && !selectedImage) || isLoading}
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
