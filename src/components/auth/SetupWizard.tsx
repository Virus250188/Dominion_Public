"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Lock, ArrowRight } from "lucide-react";
import { createInitialUser } from "@/lib/actions/auth";

export function SetupWizard() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwoerter stimmen nicht ueberein");
      return;
    }

    setLoading(true);
    try {
      const result = await createInitialUser({ username, password });
      if (result.success) {
        router.push("/login");
      }
    } catch {
      setError("Fehler beim Erstellen des Kontos");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="setup-username">
          <User className="inline h-3.5 w-3.5 mr-1" />
          Benutzername
        </Label>
        <Input
          id="setup-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="setup-password">
          <Lock className="inline h-3.5 w-3.5 mr-1" />
          Passwort
        </Label>
        <Input
          id="setup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mindestens 6 Zeichen"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="setup-confirm">Passwort bestaetigen</Label>
        <Input
          id="setup-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="mr-2 h-4 w-4" />
        )}
        Dashboard einrichten
      </Button>
    </form>
  );
}
