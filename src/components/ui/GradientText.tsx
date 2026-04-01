"use client";

interface GradientTextProps {
  text: string;
  className?: string;
  from?: string;
  via?: string;
  to?: string;
}

export function GradientText({
  text,
  className = "",
  from = "#60a5fa",
  via = "#a78bfa",
  to = "#38bdf8",
}: GradientTextProps) {
  return (
    <span
      className={`inline-block bg-clip-text text-transparent animate-gradient-shift ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${from}, ${via}, ${to}, ${from})`,
        backgroundSize: "200% 100%",
      }}
    >
      {text}
    </span>
  );
}
