"use client";

import { signIn } from "next-auth/react";
import {
  Bus,
  Shield,
  Users,
  MapPin,
  Ticket,
  BarChart3,
  ArrowRight,
  Zap,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const roles = [
  {
    title: "SuperAdmin",
    description:
      "Contrôle total de la plateforme. Gère toutes les entreprises, surveille les statistiques globales et configure le système.",
    icon: Shield,
    color: "text-rose-600",
    bg: "bg-rose-50",
    borderColor: "border-rose-200",
    badgeColor: "bg-rose-100 text-rose-800",
    features: [
      "Vue multi-tenant globale",
      "Gestion des entreprises",
      "Statistiques consolidées",
      "Configuration système",
    ],
  },
  {
    title: "Admin",
    description:
      "Gère une entreprise de transport. Configure les bus, crée les trajets, et supervise les agents et les ventes.",
    icon: BarChart3,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    borderColor: "border-emerald-200",
    badgeColor: "bg-emerald-100 text-emerald-800",
    features: [
      "Gestion de flotte",
      "Planification des trajets",
      "Gestion des agents",
      "Rapports de vente",
    ],
  },
  {
    title: "Agent",
    description:
      "Gère les embarquements au quotidien. Scanne les billets, valide les passagers et suit l'état des trajets en temps réel.",
    icon: Users,
    color: "text-amber-600",
    bg: "bg-amber-50",
    borderColor: "border-amber-200",
    badgeColor: "bg-amber-100 text-amber-800",
    features: [
      "Scan de billets QR",
      "Gestion d'embarquement",
      "Suivi en temps réel",
      "Notifications live",
    ],
  },
  {
    title: "Client",
    description:
      "Recherche des trajets, réserve des places en ligne et consulte ses billets. Interface simple et mobile-first.",
    icon: MapPin,
    color: "text-sky-600",
    bg: "bg-sky-50",
    borderColor: "border-sky-200",
    badgeColor: "bg-sky-100 text-sky-800",
    features: [
      "Recherche de trajets",
      "Réservation en ligne",
      "Billets numériques",
      "Historique complet",
    ],
  },
];

const techStack = [
  { label: "Next.js 16", icon: Zap },
  { label: "TypeScript", icon: Ticket },
  { label: "Prisma ORM", icon: BarChart3 },
  { label: "NextAuth.js", icon: Shield },
  { label: "Socket.io", icon: Globe },
  { label: "Tailwind CSS", icon: Bus },
];

const demoAccounts = [
  { email: "superadmin@busgo.com", role: "SuperAdmin" },
  { email: "admin@fastbus.com", role: "Admin" },
  { email: "agent@fastbus.com", role: "Agent" },
  { email: "client@demo.com", role: "Client" },
];

export default function HomePage() {
  const handleQuickLogin = (email: string) => {
    signIn("credentials", {
      email,
      password: "Demo1234!",
      redirect: false,
    }).then((result) => {
      if (result?.ok) {
        fetch("/api/auth/session")
          .then((r) => r.json())
          .then((session) => {
            const role = session?.user?.role;
            const routes: Record<string, string> = {
              superadmin: "/superadmin",
              admin: "/admin",
              agent: "/agent",
              client: "/client",
            };
            window.location.href = routes[role] || "/client";
          });
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-muted/50 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24 text-center">
          <Badge variant="secondary" className="mb-4">
            Multi-tenant · Temps réel · 4 rôles
          </Badge>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-6">
            <Bus className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Bus Go
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Plateforme complète de gestion de transport par autobus. Réservation
            en ligne, suivi en temps réel, gestion multi-entreprise et
            embarquement digital.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => (window.location.href = "/login")} className="gap-2">
              Se connecter
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" })}>
              Voir la démo
            </Button>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {techStack.map((tech) => (
              <div
                key={tech.label}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <tech.icon className="h-4 w-4" />
                <span>{tech.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight">
            4 rôles, un écosystème complet
          </h2>
          <p className="mt-2 text-muted-foreground">
            Chaque acteur du transport dispose d&apos;une interface adaptée à ses besoins.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {roles.map((role) => (
            <Card
              key={role.title}
              className={`${role.borderColor} transition-shadow hover:shadow-md`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${role.bg}`}>
                    <role.icon className={`h-5 w-5 ${role.color}`} />
                  </div>
                  <Badge className={role.badgeColor}>{role.title}</Badge>
                </div>
                <CardTitle className="text-lg mt-3">{role.title}</CardTitle>
                <CardDescription className="text-sm">
                  {role.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {role.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className={`h-1.5 w-1.5 rounded-full ${role.color.replace("text-", "bg-")}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Demo Accounts Quick Access */}
      <section id="demo-section" className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              Tester chaque rôle
            </h2>
            <p className="mt-2 text-muted-foreground">
              Cliquez sur un compte pour vous connecter instantanément (mot de passe : <code className="text-xs bg-muted px-1.5 py-0.5 rounded">Demo1234!</code>).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
            {demoAccounts.map((account) => {
              const role = roles.find((r) => r.title === account.role);
              return (
                <button
                  key={account.email}
                  onClick={() => handleQuickLogin(account.email)}
                  className={`rounded-xl border-2 ${role?.borderColor} ${role?.bg} p-4 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <Badge className={role?.badgeColor ?? ""} >
                    {account.role}
                  </Badge>
                  <p className="text-sm font-medium mt-2">{account.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cliquez pour tester →
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t py-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <Bus className="h-4 w-4" />
          <span>Bus Go - Plateforme de gestion de transport</span>
        </div>
      </footer>
    </div>
  );
}