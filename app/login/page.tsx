"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!isLogin) {
      // Registration flow
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to register");
        setLoading(false);
        return;
      }
    }

    // Login flow (runs immediately after successful registration too)
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/chat");
      router.refresh();
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-space-950 relative overflow-hidden">
      <div className="starfield" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md p-8 glass-card border border-white/10 shadow-glass-lg relative z-10 mx-4"
      >
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-cyan-glow">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to SHIVAM
          </h1>
          <p className="text-slate-400 text-sm">
            {isLogin
              ? "Sign in to access your secure AI chats"
              : "Create an account to isolate your data"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all touch-manipulation"
              placeholder="you@enterprise.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={4}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all touch-manipulation"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl transition-all shadow-glass disabled:opacity-50 flex items-center justify-center gap-2 group touch-manipulation"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>

        <div className="mt-8 text-center relative z-10">
          <p className="text-sm text-slate-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              {isLogin ? "Register here" : "Sign in here"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
