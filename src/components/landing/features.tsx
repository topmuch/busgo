"use client";

import { motion } from "framer-motion";
import {
  Smartphone,
  LayoutGrid,
  PhoneCall,
  Gift,
  Monitor,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Smartphone,
    title: "PWA Mobile Offline-first",
    description:
      "Fonctionne même sans réseau. L'agent peut scanner les billets, marquer les absents et gérer l'embarquement dans les zones à faible connectivité.",
    bg: "bg-blue-50",
    color: "text-blue-600",
  },
  {
    icon: LayoutGrid,
    title: "Gestion d'embarquement",
    description:
      "5 états de siège en temps réel : libre, vendu, embarqué, en retard, absent. Plan du bus interactif avec vue d'ensemble instantanée.",
    bg: "bg-green-50",
    color: "text-green-600",
  },
  {
    icon: PhoneCall,
    title: "Appel des retardataires",
    description:
      "Lien direct agent ↔ passager. Le passager signale son retard, l'agent décide d'attendre ou de partir. Communication humaine, pas un robot.",
    bg: "bg-purple-50",
    color: "text-purple-600",
  },
  {
    icon: Gift,
    title: "Codes promo automatiques",
    description:
      "10% de réduction automatique pour chaque passager manquant. Fidélisez au lieu de punir. Augmentez le taux de retour de 31%.",
    bg: "bg-rose-50",
    color: "text-rose-600",
  },
  {
    icon: Monitor,
    title: "Écrans TV temps réel",
    description:
      "Affichez les départs en temps réel sur des écrans dans la gare. Annonces vocales automatiques. Les passagers savent où aller.",
    bg: "bg-amber-50",
    color: "text-amber-600",
  },
  {
    icon: BarChart3,
    title: "Rapports & analytics",
    description:
      "Rapports PDF automatiques après chaque départ. ROI calculé en temps réel. Score de fiabilité par passager.",
    bg: "bg-sky-50",
    color: "text-sky-600",
  },
];

export function Features() {

  return (
    <section id="fonctionnalites" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Tout ce dont vous avez besoin
          </h2>
          <p className="mt-3 text-gray-500">
            Une suite complète d&apos;outils pour optimiser chaque départ
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              className="bg-white border rounded-2xl p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg}`}
              >
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{feature.title}</h3>
              <p className="mt-2 text-gray-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}