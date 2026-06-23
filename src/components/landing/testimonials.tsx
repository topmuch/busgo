"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    initials: "MD",
    gradient: "from-amber-400 to-orange-500",
    name: "Moussa Diallo",
    role: "Directeur, Dakar Dem Dikk",
    quote:
      "Depuis qu'on utilise Bus Go, notre taux d'embarquement est passé de 82% à 91%. On économise 500 000 FCFA par mois en récupérant les places des absents. L'outil a transformé notre façon de travailler.",
    badges: [
      { label: "91% embarquement", color: "bg-green-50 text-green-700" },
      { label: "500K FCFA/mois", color: "bg-blue-50 text-blue-700" },
    ],
  },
  {
    initials: "AB",
    gradient: "from-emerald-400 to-teal-500",
    name: "Aïssatou Ba",
    role: "Responsable exploitation, STS",
    quote:
      "15 bus équipés en 2 jours. Nos agents ont adopté l'outil immédiatement, même ceux qui n'avaient jamais utilisé de smartphone. 98% de satisfaction chez nos agents.",
    badges: [
      { label: "15 bus", color: "bg-green-50 text-green-700" },
      { label: "98% satisfaction", color: "bg-blue-50 text-blue-700" },
    ],
  },
  {
    initials: "IN",
    gradient: "from-blue-400 to-indigo-500",
    name: "Ibrahima Ndiaye",
    role: "Gérant, Voyage Sénégal",
    quote:
      "Le score de fiabilité et les codes promo automatiques ont fait exploser notre taux de retour client. On est passé de 60% à 91% de taux de retour. 2 millions FCFA de CA récupéré.",
    badges: [
      { label: "31% retour", color: "bg-green-50 text-green-700" },
      { label: "2M FCFA CA", color: "bg-blue-50 text-blue-700" },
    ],
  },
];

export function Testimonials() {

  return (
    <section id="temoignages" className="py-20 md:py-28 bg-gray-50">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ils nous font confiance
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.name}
              className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border hover:shadow-lg transition-shadow duration-300"
            >
              {/* Avatar */}
              <div
                className={`h-16 w-16 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center`}
              >
                <span className="text-white font-bold text-lg">
                  {testimonial.initials}
                </span>
              </div>

              {/* Name & Role */}
              <h3 className="mt-4 font-semibold">{testimonial.name}</h3>
              <p className="text-sm text-gray-500">{testimonial.role}</p>

              {/* Stars */}
              <div className="text-amber-400 text-lg mt-3">⭐⭐⭐⭐⭐</div>

              {/* Quote */}
              <p className="mt-4 text-gray-600 text-sm leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              {/* Badges */}
              <div className="mt-5 flex flex-wrap gap-2">
                {testimonial.badges.map((badge) => (
                  <span
                    key={badge.label}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}