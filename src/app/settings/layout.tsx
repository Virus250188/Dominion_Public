import Link from "next/link";
import { Palette, AppWindow, Database, ArrowLeft, Sparkles } from "lucide-react";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="glass-surface w-64 shrink-0 border-r border-border p-4 flex flex-col gap-1">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zum Dashboard
        </Link>

        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
          Einstellungen
        </div>

        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
        >
          <Palette className="h-4 w-4" />
          Erscheinungsbild
        </Link>
        <Link
          href="/settings/apps"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
        >
          <AppWindow className="h-4 w-4" />
          Apps verwalten
        </Link>
        <Link
          href="/settings/system"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
        >
          <Database className="h-4 w-4" />
          System
        </Link>
        <Link
          href="/settings/ai"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          KI Assistent
        </Link>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
