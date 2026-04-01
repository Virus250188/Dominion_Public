import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card rounded-2xl p-8 text-center max-w-md">
        <h2 className="text-xl font-semibold mb-2">Seite nicht gefunden</h2>
        <p className="text-muted-foreground mb-4">Die angeforderte Seite existiert nicht.</p>
        <Link href="/" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
