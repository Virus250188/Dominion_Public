"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card rounded-2xl p-8 text-center max-w-md">
        <h2 className="text-xl font-semibold mb-2">Etwas ist schiefgelaufen</h2>
        <p className="text-muted-foreground mb-4">{error.message || "Ein unerwarteter Fehler ist aufgetreten."}</p>
        <button onClick={reset} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
