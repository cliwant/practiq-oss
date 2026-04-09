"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, Square, SkipForward } from "lucide-react";

export interface DemoStep {
  id: string;
  label: string;
  durationMs: number;
  action: () => void;
}

interface DemoModeProps {
  isActive: boolean;
  onToggle: () => void;
  steps: DemoStep[];
}

export function DemoMode({ isActive, onToggle, steps }: DemoModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isActive || isPaused) return;
    if (currentStep >= steps.length) {
      // Demo finished, loop or stop
      const t = setTimeout(() => {
        setCurrentStep(0);
      }, 3000);
      return () => clearTimeout(t);
    }

    const step = steps[currentStep];
    step.action();

    const t = setTimeout(() => {
      setCurrentStep((s) => s + 1);
    }, step.durationMs);

    return () => clearTimeout(t);
  }, [isActive, isPaused, currentStep, steps]);

  // Reset on toggle
  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      setIsPaused(false);
    }
  }, [isActive]);

  // Esc to exit
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggle();
      if (e.key === " ") { e.preventDefault(); setIsPaused((p) => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isActive, onToggle]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] pointer-events-auto"
      >
        <div className="rounded-full border border-zinc-700 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-2xl shadow-black/60 px-4 py-2.5 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-zinc-300">Demo</span>
          </div>

          <div className="h-3 w-px bg-zinc-700" />

          <div className="text-xs text-zinc-400 min-w-[180px]">
            {currentStep < steps.length ? steps[currentStep].label : "Looping in 3s..."}
          </div>

          <div className="h-3 w-px bg-zinc-700" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="w-7 h-7 rounded-full hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setCurrentStep((s) => Math.min(s + 1, steps.length))}
              className="w-7 h-7 rounded-full hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Skip"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggle}
              className="w-7 h-7 rounded-full hover:bg-red-500/20 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
              title="Stop demo (Esc)"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
