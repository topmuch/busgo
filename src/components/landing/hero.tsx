"use client";

import { ArrowRight, Play, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const seatGrid = [
  { status: "boarded" },
  { status: "boarded" },
  { status: "enroute" },
  { status: "empty" },
  { status: "boarded" },
  { status: "absent" },
  { status: "boarded" },
  { status: "boarded" },
  { status: "enroute" },
  { status: "boarded" },
  { status: "empty" },
  { status: "boarded" },
];

const seatColor = (status: string) => {
  switch (status) {
    case "boarded":
      return "bg-emerald-500";
    case "enroute":
      return "bg-yellow-400";
    case "empty":
      return "bg-muted-foreground/30";
    case "absent":
      return "bg-red-500";
    default:
      return "bg-muted-foreground/30";
  }
};

export function Hero() {
  const handleScrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center pt-16"
    >
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 w-full py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Text */}
          <div className="flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0, ease: "easeOut" }}
            >
              <Badge
                variant="secondary"
                className="text-sm px-3 py-1.5 rounded-full bg-primary/10 text-primary border-primary/20"
              >
                🚌 Gestion d&apos;embarquement pour compagnies de bus
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
            >
              Ne laissez plus un siège vide au départ
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="text-lg text-muted-foreground max-w-xl leading-relaxed"
            >
              Bus Go aide les compagnies de bus à identifier les passagers
              absents, les appeler avant le départ et les fidéliser.
              Notifications vocales gratuites, 0 FCFA de SMS.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-700 hover:to-violet-700 text-base px-6 h-12 rounded-lg"
                onClick={() => handleScrollTo("#calculateur-roi")}
              >
                COMMENCER L&apos;ESSAI GRATUIT
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-6 h-12 rounded-lg"
                onClick={() => handleScrollTo("#comment-ca-marche")}
              >
                <Play className="h-4 w-4 mr-1" />
                Voir la démo
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              className="flex flex-wrap gap-x-5 gap-y-2 pt-2"
            >
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                14 jours gratuits
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                Sans carte bancaire
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                Paiement Wave/Orange Money
              </span>
            </motion.div>
          </div>

          {/* Right Column - Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            <div className="rounded-2xl border border-border shadow-2xl overflow-hidden">
              {/* Window chrome */}
              <div className="bg-muted px-4 py-3 flex items-center gap-2 border-b border-border">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-muted-foreground font-medium">
                  Dashboard Bus Go
                </span>
              </div>

              {/* Dashboard content */}
              <div className="bg-muted/50 p-5 space-y-5">
                {/* Stat Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
                    <div className="text-xs text-muted-foreground mb-1">
                      Taux d&apos;embarquement
                    </div>
                    <div className="text-xl font-bold text-emerald-600">
                      91%
                    </div>
                  </div>
                  <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
                    <div className="text-xs text-muted-foreground mb-1">
                      Revenus du jour
                    </div>
                    <div className="text-xl font-bold text-primary">
                      285 000 F
                    </div>
                  </div>
                  <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Passagers</div>
                    <div className="text-xl font-bold text-fuchsia-600 dark:text-fuchsia-400">
                      156
                    </div>
                  </div>
                </div>

                {/* Seat Grid */}
                <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
                  <div className="text-xs text-muted-foreground mb-3 font-medium">
                    Plan du bus — Trajet Dakar → Saint-Louis
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {seatGrid.map((seat, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-md flex items-center justify-center"
                        title={seat.status}
                      >
                        <div
                          className={`w-8 h-8 rounded-md ${seatColor(seat.status)}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground/70">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />{" "}
                      Embarqué
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400" />{" "}
                      En route
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/30" />{" "}
                      Vide
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />{" "}
                      Absent
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}