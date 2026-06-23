"use client";

import { motion } from "framer-motion";
import { X, Check, ChevronRight } from "lucide-react";

const comparisons = [
  { category: "Embarquement", avant: "Cahier + stylo", apres: "PWA interactive" },
  { category: "Passagers manquants", avant: "Découverts au dernier moment", apres: "Identifiés 10 min avant" },
  { category: "Communication", avant: "Appels aléatoires", apres: "Lien direct agent ↔ passager" },
  { category: "Taux d'embarquement", avant: "80-85%", apres: "91-95%" },
  { category: "Économie / mois", avant: "0 FCFA", apres: "6 000 000 FCFA" },
];

export function Comparison() {
  return (
    <section id="avant-apres" className="py-20 md:py-28 bg-gray-50">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Avant Bus Go vs Après Bus Go
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Headers */}
          <div className="grid grid-cols-[140px_1fr_auto_1fr] sm:grid-cols-[180px_1fr_auto_1fr] gap-2 sm:gap-4 items-center mb-4 px-4 sm:px-6">
            <div />
            <div className="bg-red-50 text-red-700 rounded-lg px-4 py-2 text-center font-semibold text-sm">
              Avant
            </div>
            <div />
            <div className="bg-green-50 text-green-700 rounded-lg px-4 py-2 text-center font-semibold text-sm">
              Après Bus Go
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-3">
            {comparisons.map((item, i) => (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
                className="grid grid-cols-[140px_1fr_auto_1fr] sm:grid-cols-[180px_1fr_auto_1fr] gap-2 sm:gap-4 items-center bg-white rounded-xl border p-4 sm:p-5"
              >
                <span className="font-medium text-gray-700 text-sm">
                  {item.category}
                </span>
                <div className="flex items-center gap-2 text-red-600">
                  <X className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{item.avant}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">{item.apres}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}