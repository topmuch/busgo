"use client";

import { Users, ClipboardList, Frown, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const painCards = [
  {
    icon: Users,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    title: "Des places perdues chaque jour",
    description:
      "5 à 10% de passagers ne se présentent pas au départ. Des places vendues mais jamais remplies.",
  },
  {
    icon: ClipboardList,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Un embarquement manuel et stressant",
    description:
      "Cahiers papier, appels téléphoniques inefficaces, aucune visibilité en temps réel sur l'état de l'embarquement.",
  },
  {
    icon: Frown,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    title: "Des clients frustrés qui ne reviennent pas",
    description:
      "Un retard de 5 minutes suffit pour perdre un client à vie. Pas de suivi, pas de fidélisation.",
  },
];

export function PainPoints() {
  return (
    <section id="probleme" className="py-20 md:py-28 bg-gray-50">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold text-center text-gray-900"
        >
          Vous reconnaissez ces situations ?
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          {painCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center mb-4`}
              >
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {card.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {card.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Impact Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 rounded-xl bg-red-50 border border-red-200 p-6 md:p-8 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-800 text-sm uppercase tracking-wide">
              Impact financier
            </span>
          </div>
          <p className="text-red-700 font-semibold text-lg md:text-xl">
            25 000 FCFA × 10 trajets/jour = 250 000 FCFA/jour de revenus
            perdus
          </p>
          <p className="text-red-600 mt-2 font-medium">
            Soit 7,5 millions FCFA perdus chaque mois.
          </p>
        </motion.div>
      </div>
    </section>
  );
}