"use client";

import { Phone, Brain, Heart, Bus } from "lucide-react";
import { motion } from "framer-motion";

const advantages = [
  {
    icon: Phone,
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    title: "Un lien humain, pas un robot",
    description:
      "Communication directe entre l'agent d'embarquement et le passager. Le passager peut signaler son retard en un clic depuis son téléphone.",
  },
  {
    icon: Brain,
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    title: "Le système apprend de chaque trajet",
    description:
      "Score de fiabilité par passager, historique des promesses tenues. Le système sait quand attendre un passager fiable.",
  },
  {
    icon: Heart,
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-600 dark:text-rose-400",
    title: "La flexibilité qui fidélise",
    description:
      "Attendre 5 minutes si le passager est fiable. Offrir un code promo de 10% si un passager est manquant. Fidéliser au lieu de punir.",
  },
];

export function Solution() {
  return (
    <section id="solution" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold text-center text-foreground"
        >
          La solution qui transforme vos départs
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 mt-14 items-center">
          {/* Left - Cards */}
          <div className="space-y-6">
            {advantages.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="flex gap-4"
              >
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center`}
                >
                  <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {card.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex items-center justify-center"
          >
            <div className="w-full aspect-square max-w-sm rounded-2xl bg-gradient-to-br from-primary/10 to-fuchsia-500/10 border border-border flex items-center justify-center">
              <Bus className="w-24 h-24 text-primary/50 opacity-60" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}