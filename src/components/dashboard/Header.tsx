"use client";

import { useState, useEffect } from "react";
import { Settings, Sparkles, Lock, LockOpen, LogOut } from "lucide-react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useEditMode } from "@/contexts/EditModeContext";

function EditModeToggle() {
  const { editMode, toggleEditMode } = useEditMode();
  return (
    <button
      onClick={toggleEditMode}
      className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-accent"
      title={editMode ? "Dashboard sperren" : "Dashboard bearbeiten"}
    >
      {editMode ? (
        <LockOpen className="h-5 w-5 text-primary" />
      ) : (
        <Lock className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Guten Morgen";
  if (hour >= 12 && hour < 17) return "Guten Tag";
  if (hour >= 17 && hour < 22) return "Guten Abend";
  return "Gute Nacht";
}

function formatTime(): string {
  return new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(): string {
  return new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface HeaderProps {
  searchBar?: React.ReactNode;
  aiConfigured?: boolean;
  aiProvider?: string;
  aiModel?: string;
}

export function Header({ searchBar, aiConfigured = false, aiProvider = "", aiModel = "" }: HeaderProps) {
  const [time, setTime] = useState(() => formatTime());
  const [date, setDate] = useState(() => formatDate());
  const [greeting, setGreeting] = useState(() => getGreeting());
  const [mounted, setMounted] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setTime(formatTime());
      setDate(formatDate());
      setGreeting(getGreeting());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <header className="glass-surface w-full px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-trimmed.png" alt="Dominion" className="h-7 w-7" />
            <span className="text-lg text-foreground" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Dominion</span>
          </div>
          <div className="h-6 w-20" />
        </div>
      </header>
    );
  }

  return (
    <header className="glass-surface w-full px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Left: Logo + Greeting */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-trimmed.png" alt="Dominion" className="h-7 w-7" />
            <span className="text-lg text-foreground" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Dominion</span>
          </div>
          <div className="hidden sm:block h-6 w-px bg-border" />
          <span className="hidden sm:block text-sm text-muted-foreground">{greeting}</span>
        </div>

        {/* Center: Search bar */}
        {searchBar && (
          <div className="hidden md:flex flex-1 justify-center px-4">
            <div className="flex items-center gap-2">
              {searchBar}
              <kbd className="pointer-events-none hidden lg:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-70">
                <span className="text-xs">Ctrl</span>K
              </kbd>
            </div>
          </div>
        )}

        {/* Right: Clock + AI + Settings */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium tabular-nums text-foreground">{time}</span>
            <span className="text-xs text-muted-foreground">{date}</span>
          </div>
          <button
            onClick={aiConfigured ? () => setChatOpen((v) => !v) : undefined}
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              aiConfigured
                ? "hover:bg-accent cursor-pointer"
                : "opacity-30 cursor-not-allowed"
            }`}
            title={aiConfigured ? "KI Chat" : "KI nicht konfiguriert"}
          >
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            {aiConfigured && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </button>
          <EditModeToggle />
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-accent"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div className="h-6 w-px bg-border" />
          <button
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-destructive/20"
            title="Abmelden"
          >
            <LogOut className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Chat Panel */}
      <AnimatePresence>
        {chatOpen && aiConfigured && (
          <ChatPanel
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            provider={aiProvider}
            model={aiModel}
          />
        )}
      </AnimatePresence>
    </header>
  );
}
