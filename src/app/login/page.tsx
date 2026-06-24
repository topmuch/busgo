"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { Bus, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Demo accounts for quick-login buttons.
//
// SECURITY: Demo accounts are ONLY shown when the env var NEXT_PUBLIC_SHOW_DEMO_LOGINS
// is set to "true". In production, set NEXT_PUBLIC_SHOW_DEMO_LOGINS to undefined/false
// to hide the demo-login buttons entirely.
//
// The password value below is the demo password "Demo1234!" used by the seed script.
// It is intentionally exposed for development convenience only — it does NOT grant
// access to any production system (the database must be seeded with these exact
// credentials for the demo logins to work).
const SHOW_DEMO_LOGINS = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === "true";

const demoAccounts = SHOW_DEMO_LOGINS
  ? [
      { email: "superadmin@busgo.com", password: "Demo1234!", role: "SuperAdmin", color: "bg-rose-100 text-rose-800" },
      { email: "admin@fastbus.com",    password: "Demo1234!", role: "Admin",     color: "bg-emerald-100 text-emerald-800" },
      { email: "agent@fastbus.com",    password: "Demo1234!", role: "Agent",     color: "bg-amber-100 text-amber-800" },
      { email: "client@demo.com",      password: "Demo1234!", role: "Client",    color: "bg-sky-100 text-sky-800" },
    ]
  : [];

const errorMap: Record<number, string> = {
  400: "Email et mot de passe requis",
  401: "Identifiants incorrects",
  403: "Compte désactivé",
  500: "Erreur serveur",
};

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const err = p.get("error");
    if (err) {
      setError(err);
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const login = useCallback(async (emailVal: string, passwordVal: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, password: passwordVal }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || errorMap[res.status] || `Erreur ${res.status}`);
        return;
      }

      const data = await res.json();

      // Client-side redirect using RELATIVE path - browser stays on current domain
      window.location.href = data.redirect || "/superadmin";
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  const handleQuickLogin = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    login(account.email, account.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Bus className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Bus Go</h1>
          <p className="text-muted-foreground text-sm">Connectez-vous à votre espace</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connexion</CardTitle>
            <CardDescription>Entrez vos identifiants pour accéder à votre tableau de bord.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="vous@exemple.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? "text" : "password"}
                    placeholder="Votre mot de passe" value={password}
                    onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                  <Button type="button" variant="ghost" size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connexion...</> : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {demoAccounts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Comptes de démonstration</CardTitle>
              <CardDescription className="text-xs">Cliquez pour vous connecter automatiquement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((account) => (
                  <button key={account.email} type="button" onClick={() => handleQuickLogin(account)}
                    className="rounded-lg border p-2.5 text-left hover:bg-muted/80 transition-colors">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${account.color}`}>{account.role}</span>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{account.email}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}