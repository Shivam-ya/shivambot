"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const themes = [
  { key: "dark",   Icon: Moon,    label: "Dark" },
  { key: "light",  Icon: Sun,     label: "Light" },
  { key: "system", Icon: Monitor, label: "System" },
] as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  const current = themes.find((t) => t.key === theme) ?? themes[0];
  const Icon = current.Icon;

  const cycle = () => {
    const idx = themes.findIndex((t) => t.key === theme);
    setTheme(themes[(idx + 1) % themes.length].key);
  };

  return (
    <button
      onClick={cycle}
      aria-label={`Switch theme (current: ${current.label})`}
      title={`Theme: ${current.label}`}
      className="relative w-9 h-9 rounded-lg glass-card flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
