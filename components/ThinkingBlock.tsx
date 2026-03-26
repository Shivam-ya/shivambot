"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Brain, Loader2 } from "lucide-react";

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
}

export default function ThinkingBlock({ content, isStreaming = false }: ThinkingBlockProps) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(37,99,235,0.05) 100%)",
        border: "1px solid rgba(124,58,237,0.2)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <button
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        {isStreaming ? (
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
        ) : (
          <Brain className="w-4 h-4 text-purple-400 flex-shrink-0" />
        )}
        <span className="text-purple-300 text-xs font-semibold uppercase tracking-widest flex-1">
          {isStreaming ? "Thinking…" : "Chain of Thought"}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-purple-400" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="thinking-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-purple-500/10">
              <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                {content}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-3.5 bg-purple-400 ml-0.5 animate-pulse align-middle" />
                )}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
