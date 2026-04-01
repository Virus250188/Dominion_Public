"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  className?: string;
  revealDelay?: number;
}

export function DecryptedText({
  text,
  speed = 50,
  className = "",
  revealDelay = 500,
}: DecryptedTextProps) {
  const [displayed, setDisplayed] = useState("");
  const revealedRef = useRef(0);
  const doneRef = useRef(false);

  const scramble = useCallback(() => {
    const r = revealedRef.current;
    setDisplayed(
      text
        .split("")
        .map((ch, i) => {
          if (ch === " ") return " ";
          if (i < r) return text[i];
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        })
        .join("")
    );
  }, [text]);

  useEffect(() => {
    revealedRef.current = 0;
    doneRef.current = false;

    // Phase 1: scramble at interval
    const scrambleId = setInterval(scramble, speed);

    // Phase 2: reveal one char at a time after delay
    const revealTimeout = setTimeout(() => {
      const revealId = setInterval(() => {
        revealedRef.current++;
        if (revealedRef.current >= text.length) {
          doneRef.current = true;
          clearInterval(revealId);
          clearInterval(scrambleId);
          setDisplayed(text);
        }
      }, speed * 1.5);
    }, revealDelay);

    return () => {
      clearInterval(scrambleId);
      clearTimeout(revealTimeout);
    };
  }, [text, speed, revealDelay, scramble]);

  return <span className={className}>{displayed || text}</span>;
}
