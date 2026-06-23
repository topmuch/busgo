"use client";

import { Upload, Smartphone, PhoneCall, FileBarChart } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    number: 1,
    icon: Upload,
    title: "Importez vos passagers",
    description:
      "Upload CSV ou saisie manuelle au guichet. 2 minutes par trajet.",
  },
  {
    number: 2,
    icon: Smartphone,
    title: "L'agent vérifie l'embarquement",
    description:
      "L'agent scanne les billets avec la PWA mobile. Plan du bus interactif en 30 secondes.",
  },
  {
    number: 3,
    icon: PhoneCall,
    title: "Appel des retardataires",
    description:
      "Contact direct agent ↔ passager. Notification vocale automatique. 2 minutes.",
  },
  {
    number: 4,
    icon: FileBarChart,
    title: "Départ et rapport automatique",
    description:
      "Rapport PDF automatique. Codes promo pour les manquants. 1 clic.",
  },
];

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="py-20 md:py-28 bg-muted/50">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold text-center text-foreground"
        >
          Simple comme 1-2-3-4
        </motion.h2>

        {/* Timeline */}
        <div className="mt-14 max-w-2xl mx-auto">
          <div className="relative border-l-2 border-primary/20 pl-8 md:pl-12 space-y-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="relative"
              >
                {/* Circle */}
                <div className="absolute left-[-21px] md:left-[-29px] w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {step.number}
                </div>

                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <step.icon className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Result Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-14 max-w-2xl mx-auto bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl py-5 px-6 text-center"
        >
          <p className="text-emerald-800 dark:text-emerald-300 font-semibold text-lg">
            🎉 91% de taux d&apos;embarquement en moyenne
          </p>
        </motion.div>
      </div>
    </section>
  );
}