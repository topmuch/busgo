"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const trustBadges = [
  "✓ 14 jours gratuits",
  "✓ Sans carte bancaire",
  "✓ Support WhatsApp 7j/7",
];

export function CTAFinal() {
  return (
    <section className="py-20 md:py-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto max-w-7xl px-4"
      >
        <div className="rounded-2xl bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-700 px-6 py-16 text-center text-primary-foreground md:py-20">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0, duration: 0.6, ease: "easeOut" }}
            className="text-3xl font-bold md:text-4xl"
          >
            Prêt à ne plus perdre un seul passager ?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
            className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/80"
          >
            Rejoignez les compagnies de bus qui optimisent leurs départs avec
            Bus Go. Inscription gratuite en 2 minutes.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            className="mt-8"
          >
            <Button
              size="lg"
              className="bg-card text-primary text-lg font-bold hover:bg-primary-foreground/10 hover:scale-105 transition-transform duration-200 px-8 py-4 rounded-xl"
            >
              Créer mon compte gratuit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.45, duration: 0.6, ease: "easeOut" }}
            className="mt-6 flex flex-wrap justify-center gap-4"
          >
            {trustBadges.map((badge) => (
              <span key={badge} className="text-sm text-primary-foreground/60">
                {badge}
              </span>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}