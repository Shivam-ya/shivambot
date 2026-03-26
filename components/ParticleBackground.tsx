"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  depth: number; // For parallax speed adjustment
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  
  // Mouse position ref
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    
    const isDark = resolvedTheme !== "light";

    // Colors matching user prompts perfectly
    const colors = isDark 
      ? ["#00d4cf", /* cyan */ "#3b82f6", /* electric blue */ "#a855f7", /* purple */ "#ec4899" /* pink */] 
      : ["#bae6fd", /* light blue */ "#d8b4fe", /* pastel purple */ "#fbcfe8", /* soft pink */ "#67e8f9" /* cyan */];

    const calculateParticleCount = () => {
      const area = window.innerWidth * window.innerHeight;
      // Hundreds of particles: 1 per 9,000 pixels (yields ~200-300 on 1080p, keeps it elegant)
      return Math.floor(area / 9000); 
    };

    const initParticles = () => {
      particles = [];
      const particleCount = calculateParticleCount();
      for (let i = 0; i < particleCount; i++) {
        // Depth between 0.2 (far bg) and 1.0 (foreground)
        const depth = Math.random() * 0.8 + 0.2; 
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          // Fast enough to be visible, with a gentle upward drift
          vx: (Math.random() - 0.5) * 1.5 * depth,
          vy: (Math.random() - 0.5) * 1.5 * depth - (0.4 * depth),
          // Smaller size for distant particles
          size: (Math.random() * 2 + 1) * depth,
          color: colors[Math.floor(Math.random() * colors.length)],
          depth: depth
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const connectionDistance = 120; // Max distance for connecting lines

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Mouse interaction (slight repulsion + parallax follow)
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        
        if (distToMouse < 150) {
          // Gently push particles away based on depth
          p.x -= (dx / distToMouse) * 0.5 * p.depth;
          p.y -= (dy / distToMouse) * 0.5 * p.depth;
        }

        // Standard movement
        p.x += p.vx;
        p.y += p.vy;

        // Screen Wrap-around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw connections FIRST so they are beneath the dots
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dlx = p.x - p2.x;
          const dly = p.y - p2.y;
          const distance = Math.sqrt(dlx * dlx + dly * dly);

          if (distance < connectionDistance) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            // Opacity is based on how close they are
            const lineOpacity = (1 - distance / connectionDistance) * (isDark ? 0.25 : 0.35);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = lineOpacity;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }

        // Draw the dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        
        // Add subtle bloom/glow 
        ctx.shadowBlur = isDark ? 10 * p.depth : 4 * p.depth;
        ctx.shadowColor = p.color;
        
        ctx.globalAlpha = isDark ? (0.4 + p.depth * 0.4) : (0.5 + p.depth * 0.4);
        ctx.fill();
        
        // Reset shadow for lines
        ctx.shadowBlur = 0; 
      }

      animationFrameId = requestAnimationFrame(drawParticles);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseLeave);
    
    resize();
    drawParticles();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [resolvedTheme]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${
        !mounted ? "opacity-0" : resolvedTheme === "light" ? "opacity-60" : "opacity-100"
      }`}
      aria-hidden="true"
    />
  );
}
