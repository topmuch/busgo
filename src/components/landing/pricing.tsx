"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const starterFeatures = [
  "5 bus inclus",
  "500 passagers / mois",
  "200 SMS inclus",
  "Codes promo automatiques",
  "Import CSV",
  "Rapports PDF",
  "Support prioritaire WhatsApp",
];

const proFeatures = [
  "Bus illimités",
  "Passagers illimités",
  "SMS illimités",
  "Notifications vocales (TTS)",
  "WhatsApp Business intégré",
  "Accès API",
  "PWA hors-ligne",
  "Écrans TV en gare",
  "Support dédié 7j/7",
];

export function Pricing() {
  return (
    <section id="tarifs" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0, duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold md:text-4xl">
            Un prix pour chaque taille
          </h2>
          <p className="mt-3 text-gray-500">
            Payez avec Wave ou Orange Money. Pas de carte bancaire requise.
          </p>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          {/* STARTER Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
          >
            <div className="rounded-2xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <p className="text-lg font-bold uppercase tracking-wide text-gray-500">
                STARTER
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">15 000 FCFA</span>
                <span className="text-gray-500">/mois</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Pour les petites compagnies
              </p>
              <hr className="my-6 border-gray-200" />
              <ul className="space-y-3">
                {starterFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-5 w-5 shrink-0 text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="mt-8 w-full border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Commencer
              </Button>
            </div>
          </motion.div>

          {/* PRO Card — POPULAIRE */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          >
            <div className="relative rounded-2xl border-2 border-orange-500 bg-white p-8 shadow-xl shadow-orange-100 transition-shadow hover:shadow-2xl">
              <span className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold uppercase text-white">
                POPULAIRE
              </span>
              <p className="text-lg font-bold uppercase tracking-wide text-gray-500">
                PRO
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-orange-600">
                  35 000 FCFA
                </span>
                <span className="text-gray-500">/mois</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Pour les compagnies en croissance
              </p>
              <hr className="my-6 border-gray-200" />
              <ul className="space-y-3">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-5 w-5 shrink-0 text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-8 w-full bg-orange-500 font-bold text-white hover:bg-orange-600">
                Commencer
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0.45, duration: 0.5, ease: "easeOut" }}
          className="mt-8 text-center text-sm text-gray-500"
        >
          💯 14 jours d&apos;essai gratuit. Sans engagement. Annulable à tout
          moment.
        </motion.p>
      </div>
    </section>
  );
}