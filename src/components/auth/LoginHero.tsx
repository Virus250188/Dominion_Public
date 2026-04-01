"use client";

import { DecryptedText } from "@/components/ui/DecryptedText";
import { GradientText } from "@/components/ui/GradientText";

interface LoginHeroProps {
  mode: "login" | "setup";
}

export function LoginHero({ mode }: LoginHeroProps) {
  return (
    <div className="flex flex-col items-center mb-10">
      {/* Logo with glow — large and prominent */}
      <div className="relative mb-6">
        <div className="absolute inset-0 scale-[1.8] rounded-full bg-[#3b82f6]/12 blur-[60px]" />
        <div className="absolute inset-0 scale-125 rounded-full bg-[#60a5fa]/8 blur-[30px]" />
        <img
          src="/logo-trimmed.png"
          alt="Dominion"
          className="relative h-52 w-auto drop-shadow-[0_0_50px_rgba(59,130,246,0.35)]"
        />
      </div>

      {/* Title with DecryptedText effect + Machine Learning font */}
      <h1
        className="text-4xl font-normal tracking-[0.3em] text-white/90"
        style={{
          fontFamily: '"MachineLearning", sans-serif',
          textShadow: "0 0 40px rgba(59,130,246,0.25), 0 0 80px rgba(59,130,246,0.1)",
        }}
      >
        <DecryptedText
          text="DOMINION"
          speed={40}
          revealDelay={300}
          sequential
        />
      </h1>

      {/* Subtitle with GradientText effect */}
      <div className="mt-2">
        <GradientText
          text={mode === "login" ? "Self-Hosted Dashboard" : "Richte dein Dashboard ein"}
          className="text-sm tracking-widest font-medium"
          from="#3b82f6"
          via="#a78bfa"
          to="#06b6d4"
        />
      </div>
    </div>
  );
}
