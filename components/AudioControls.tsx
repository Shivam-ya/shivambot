"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface AudioControlsProps {
  onTranscript: (text: string) => void;
  textToRead?: string;
}

export default function AudioControls({ onTranscript, textToRead }: AudioControlsProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  // Set supported APis on client only to avoid SSR hydration mismatches
  useEffect(() => {
    setSttSupported(typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window));
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const recognitionRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const startListening = useCallback(() => {
    if (!sttSupported) {
      alert("Microphone is not supported or was blocked. Ensure you are using HTTPS or localhost.");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      onTranscript(transcript);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e.error);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        alert("Microphone access denied. Please allow permissions or ensure you are using HTTPS / localhost.");
      }
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [sttSupported, onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback(() => {
    if (!ttsSupported || !textToRead) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [ttsSupported, textToRead]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      {/* Microphone */}
      {sttSupported && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={isListening ? stopListening : startListening}
          aria-label={isListening ? "Stop microphone" : "Start microphone"}
          title={isListening ? "Stop recording" : "Voice input"}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            isListening
              ? "bg-red-500/20 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
              : "glass-card text-slate-400 hover:text-cyan-400"
          }`}
        >
          {isListening ? (
            <MicOff className="w-3.5 h-3.5" />
          ) : (
            <Mic className="w-3.5 h-3.5" />
          )}
        </motion.button>
      )}

      {/* TTS speaker */}
      {ttsSupported && textToRead && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={isSpeaking ? stopSpeaking : speak}
          aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
          title={isSpeaking ? "Stop" : "Read aloud"}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            isSpeaking
              ? "bg-cyan-500/20 text-cyan-400 shadow-cyan-glow"
              : "glass-card text-slate-400 hover:text-cyan-400"
          }`}
        >
          {isSpeaking ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </motion.button>
      )}
    </div>
  );
}
