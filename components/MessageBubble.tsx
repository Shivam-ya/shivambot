"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Download,
  Volume2,
  Trash2,
  User,
  Bot,
} from "lucide-react";
import ThinkingBlock from "./ThinkingBlock";
import AudioControls from "./AudioControls";
import { exportSingleMessage } from "@/lib/export-utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  model?: string;
  createdAt?: Date;
}

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onDelete?: (id: string) => void;
}

function parseContent(raw: string): { thinking: string; text: string } {
  const thinkMatch = raw.match(/^<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    return {
      thinking: thinkMatch[1].trim(),
      text: raw.slice(thinkMatch[0].length).trim(),
    };
  }
  return { thinking: "", text: raw };
}

function preProcessMarkdown(text: string): string {
  if (!text) return text;
  return text
    .replace(/\\\(/g, '$$')
    .replace(/\\\)/g, '$$')
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$');
}




function getCodeText(node: any): string {
  if (!node || !node.children) return "";
  let text = "";
  for (const child of node.children) {
    if (child.type === "text") text += child.value;
    else text += getCodeText(child);
  }
  return text;
}

function CodeCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-cyan-400 transition-colors ml-2"
      title="Copy snippet"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function MessageBubble({ message, isStreaming = false, onDelete }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const { thinking, text } = parseContent(message.content);
  const isUser = message.role === "user";

  const copyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(text || message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text, message.content]);

  const handleExport = useCallback(async () => {
    await exportSingleMessage(
      { role: message.role, content: message.content },
      "SHIVAM Chatbot"
    );
  }, [message]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} // Exponential ease-out (smooth finish)
      className={`group flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-gradient-to-br from-cyan-500 to-blue-600"
            : "bg-gradient-to-br from-purple-600 to-pink-600"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col min-w-0`}>
        {/* Thinking block (assistant only) */}
        {!isUser && (thinking || (isStreaming && message.content.startsWith("<think>"))) && (
          <ThinkingBlock
            content={thinking || message.content.replace("<think>", "").replace("</think>", "")}
            isStreaming={isStreaming && !thinking}
          />
        )}

        {/* Message content */}
        <div
          className={`rounded-2xl px-4 py-3 relative overflow-x-auto ${
            isUser
              ? "bg-gradient-to-br from-cyan-600/30 to-blue-700/20 border border-cyan-500/20 rounded-tr-sm"
              : "glass-card border border-white/08 rounded-tl-sm w-full"
          }`}
        >
          {isUser ? (
            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{text || message.content}</p>
          ) : (
            <div className="prose-ag text-slate-200 text-sm transition-all duration-300 ease-out min-w-0 break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  table({ node, ...props }) {
                    return (
                      <div className="w-full overflow-x-auto my-4 custom-scrollbar">
                        <table className="w-full min-w-[300px] text-left border-collapse" {...props} />
                      </div>
                    );
                  },
                  pre({ node, ...props }) {
                    const codeText = getCodeText(node);
                    return (
                      <div className="relative my-4 rounded-xl overflow-hidden bg-[#0d1117] border border-black/20 dark:border-white/10 shadow-xl w-full">
                        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                          <div className="flex gap-1.5 mr-4 w-16">
                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                          </div>
                          <div className="flex items-center">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Snippet</span>
                            <CodeCopyButton text={codeText} />
                          </div>
                        </div>
                        <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed select-text font-mono custom-scrollbar !text-slate-200 !whitespace-pre" {...props} />
                      </div>
                    );
                  },
                  code({ node, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="px-1.5 py-0.5 mx-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 font-mono text-[0.85em] border border-cyan-500/20" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={`${className} bg-transparent p-0 m-0 !text-slate-200 !whitespace-pre`} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {preProcessMarkdown(text || (isStreaming ? message.content : "..."))}
              </ReactMarkdown>
            </div>
          )}

          {/* Streaming cursor */}
          {isStreaming && !isUser && (
            <span className="inline-block w-1.5 h-4 bg-cyan-400 ml-1 animate-pulse align-middle" />
          )}
        </div>

        {/* Model tag + actions */}
        {!isUser && !isStreaming && (
          <div className="flex items-center gap-2 mt-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {message.model && (
              <span className="text-[10px] text-slate-600 truncate max-w-[120px]">
                {message.model.split("/").pop()}
              </span>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={copyToClipboard}
                title="Copy"
                className="w-6 h-6 rounded-md glass-card flex items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <button
                onClick={handleExport}
                title="Export to Word"
                className="w-6 h-6 rounded-md glass-card flex items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors"
              >
                <Download className="w-3 h-3" />
              </button>
              <AudioControls onTranscript={() => {}} textToRead={text} />
              {onDelete && (
                <button
                  onClick={() => onDelete(message.id)}
                  title="Delete"
                  className="w-6 h-6 rounded-md glass-card flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
        {isUser && !isStreaming && (
          <div className="flex items-center gap-1 mt-1.5 mr-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={copyToClipboard}
              title="Copy"
              className="w-6 h-6 rounded-md glass-card flex items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                title="Delete"
                className="w-6 h-6 rounded-md glass-card flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
