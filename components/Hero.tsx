"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { Zap, ArrowRight, Sparkles, Cpu, Globe, Shield } from "lucide-react";
import Link from "next/link";

// ── Particle canvas ────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 80;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.6 ? "#00d4cf" : Math.random() > 0.5 ? "#7c3aed" : "#fff",
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      }
      // Draw connecting lines between nearby particles
      ctx.globalAlpha = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,212,207,${0.12 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
    />
  );
}

// ── Animated orb ───────────────────────────────────────────────────────────
function Orb({
  className,
  delay = 0,
  duration = 8,
}: {
  className: string;
  delay?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.4, 0.7, 0.4],
        y: [0, -30, 0],
        x: [0, 15, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// ── Typewriter ─────────────────────────────────────────────────────────────
const WORDS = ["Intelligent.", "Limitless.", "SHIVAM Chatbot."];

function Typewriter() {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "pause" | "erasing">("typing");

  useEffect(() => {
    const word = WORDS[wordIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (display.length < word.length) {
        timeout = setTimeout(() => setDisplay(word.slice(0, display.length + 1)), 80);
      } else {
        timeout = setTimeout(() => setPhase("pause"), 1800);
      }
    } else if (phase === "pause") {
      timeout = setTimeout(() => setPhase("erasing"), 300);
    } else {
      if (display.length > 0) {
        timeout = setTimeout(() => setDisplay(display.slice(0, -1)), 40);
      } else {
        setWordIdx((i) => (i + 1) % WORDS.length);
        setPhase("typing");
      }
    }
    return () => clearTimeout(timeout);
  }, [display, phase, wordIdx]);

  return (
    <span className="text-cyan-400">
      {display}
      <span className="inline-block w-[2px] h-[1em] bg-cyan-400 ml-0.5 align-middle animate-pulse" />
    </span>
  );
}

// ── Feature badge ──────────────────────────────────────────────────────────
function FeatureBadge({
  Icon,
  label,
  delay,
}: {
  Icon: React.ElementType;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-white/08 text-slate-400 text-xs font-medium"
    >
      <Icon className="w-3.5 h-3.5 text-cyan-400" />
      {label}
    </motion.div>
  );
}

// ── Main Hero ──────────────────────────────────────────────────────────────
export default function Hero() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [8, -8]);
  const rotateY = useTransform(mouseX, [-300, 300], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  return (
    <section
      onMouseMove={handleMouseMove}
      className="relative w-full min-h-screen overflow-hidden bg-[#03050a] flex flex-col items-center justify-center"
    >
      {/* Animated orbs */}
      <Orb className="w-[600px] h-[600px] bg-cyan-500/20 top-[-200px] left-[-150px]" delay={0} duration={9} />
      <Orb className="w-[500px] h-[500px] bg-purple-600/25 bottom-[-100px] right-[-100px]" delay={2} duration={11} />
      <Orb className="w-[300px] h-[300px] bg-blue-600/20 top-[30%] right-[10%]" delay={1} duration={7} />
      <Orb className="w-[200px] h-[200px] bg-cyan-400/15 bottom-[20%] left-[5%]" delay={3} duration={13} />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,207,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,207,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Bottom fade-out */}
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#03050a] to-transparent z-[5] pointer-events-none" />

      {/* === Content === */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto w-full">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-cyan-400/20 text-cyan-400 text-xs font-semibold mb-8 tracking-wide"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen AI Platform • OpenRouter Powered</span>
        </motion.div>

        {/* Headline */}
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="mb-4 will-change-transform w-full"
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-4xl sm:text-7xl lg:text-8xl font-black leading-tight tracking-tighter select-none"
          >
            <span className="relative flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 w-full">
              {/* Glow layer */}
              <span
                className="absolute inset-0 blur-2xl opacity-40 bg-gradient-to-r from-cyan-400 to-purple-500 select-none"
                aria-hidden
              >
                SHIVAM'S Chatbot
              </span>
              <span className="relative bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                SHIVAM'S
              </span>
              <span className="relative bg-gradient-to-br from-cyan-300 via-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Chatbot
              </span>
            </span>
          </motion.h1>
        </motion.div>

        {/* Typewriter sub-headline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-2xl sm:text-3xl font-bold mb-6 h-10"
        >
          <Typewriter />
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed mb-10"
        >
          An enterprise-grade AI chat platform with{" "}
          <span className="text-cyan-400 font-medium">streaming responses</span>,{" "}
          <span className="text-purple-400 font-medium">chain-of-thought reasoning</span>, and
          multimodal intelligence — all in one beautiful interface.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 mb-14"
        >
          <Link
            href="/chat"
            id="launch-mission-btn"
            className="group relative flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-[#03050a] text-base overflow-hidden transition-all duration-300 hover:scale-105"
          >
            {/* Button background */}
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-300 group-hover:from-cyan-300 group-hover:to-cyan-400" />
            {/* Shine sweep */}
            <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <Zap className="relative w-5 h-5" />
            <span className="relative">Launch Mission</span>
            <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <a
            href="https://openrouter.ai/models"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl glass-card border border-white/10 hover:border-cyan-400/30 text-slate-300 hover:text-white font-semibold text-base transition-all duration-200"
          >
            <Globe className="w-4 h-4" />
            Browse Models
          </a>
        </motion.div>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex flex-wrap justify-center gap-3 mb-14"
        >
          <FeatureBadge Icon={Zap} label="Streaming Responses" delay={0.9} />
          <FeatureBadge Icon={Cpu} label="Chain-of-Thought AI" delay={1.0} />
          <FeatureBadge Icon={Shield} label="Local SQLite Storage" delay={1.1} />
          <FeatureBadge Icon={Globe} label="50+ Models via OpenRouter" delay={1.2} />
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="grid grid-cols-3 gap-8 max-w-md mx-auto"
        >
          {[
            { value: "50+", label: "Models" },
            { value: "<1s", label: "Latency" },
            { value: "100%", label: "Open Source" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black bg-gradient-to-b from-cyan-300 to-cyan-500 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
