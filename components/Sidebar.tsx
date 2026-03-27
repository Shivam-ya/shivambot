"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MessageSquare,
  Trash2,
  Zap,
  ChevronRight,
  X,
  LogOut,
} from "lucide-react";
import type { ChatSession } from "@/lib/db";
import ThemeToggle from "./ThemeToggle";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

const MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Versatile/Best)" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Fast)" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B (Great All-Rounder)" },
  { id: "gemma2-9b-it", label: "Gemma 2 9B (Google)" },
] as const;

interface SidebarProps {
  sessions: ChatSession[];
  activeSession: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({
  sessions,
  activeSession,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  selectedModel,
  onModelChange,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { data: session } = useSession();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-cyan-glow">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-white text-base tracking-tight">
            SHIVAM<span className="gradient-text"> Chatbot</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onMobileClose}
            className="lg:hidden w-7 h-7 glass-card rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>



      {/* Model selector */}
      <div className="px-3 py-3 border-b border-white/[0.06]">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">
          Model
        </label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-xs text-slate-200 bg-white/5 border border-white/08 focus:outline-none focus:border-cyan-400/40 transition-colors truncate"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id} className="bg-space-900">
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* New chat button */}
      <div className="px-3 py-3">
        <button
          id="new-chat-btn"
          onClick={onNewSession}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-400/40 text-cyan-400 text-sm font-semibold transition-all group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
          New Chat
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-xs">
            No conversations yet
          </div>
        ) : (
          sessions.map((session) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                activeSession === session.id
                  ? "bg-white/08 border border-cyan-400/20 text-white"
                  : "hover:bg-white/05 text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
              onMouseEnter={() => setHoveredId(session.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => { onSelectSession(session.id); onMobileClose(); }}
            >
              <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${activeSession === session.id ? "text-cyan-400" : ""}`} />
              <span className="text-xs truncate flex-1">{session.title}</span>

              <AnimatePresence>
                {(hoveredId === session.id || activeSession === session.id) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                    className="w-5 h-5 flex-shrink-0 rounded flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    aria-label="Delete session"
                  >
                    <Trash2 className="w-3 h-3" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer / User Profile */}
      <div className="p-3 border-t border-white/[0.06] flex items-center justify-between mt-auto">
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-xs font-semibold text-slate-200 truncate">
            {session?.user?.email || "Loading..."}
          </span>
          <span className="text-[10px] text-slate-500">Secured Session</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign Out"
          className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 h-screen bg-space-950/80 backdrop-blur-xl border-r border-white/[0.06]">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-space-900 border-r border-white/[0.06] z-50 flex flex-col"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
