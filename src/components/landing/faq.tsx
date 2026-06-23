"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "Comment fonctionne l'essai gratuit ?",
    answer:
      "Vous avez 14 jours d'essai gratuit avec accès complet à toutes les fonctionnalités PRO. Aucune carte bancaire requise. Inscription en 2 minutes. Si Bus Go ne vous convient pas, vous ne payez rien.",
  },
  {
    question: "Est-ce que ça marche sans internet ?",
    answer:
      "Oui ! L'application agent est une PWA (Progressive Web App) qui fonctionne hors-ligne. Les scans de billets et les changements de statut sont synchronisés automatiquement quand la connexion revient.",
  },
  {
    question: "Combien de temps pour mettre en place Bus Go ?",
    answer:
      "L'installation prend moins de 2 heures. Importez votre liste de passagers en CSV, configurez vos bus et vos trajets, et vous êtes prêt. Notre équipe vous accompagne gratuitement.",
  },
  {
    question:
      "Mes agents ne sont pas à l'aise avec la tech. Est-ce un problème ?",
    answer:
      "Pas du tout. Bus Go est conçu pour être aussi simple qu'un cahier papier. L'interface est en français, avec des gros boutons et un plan du bus visuel. Si un agent sait utiliser WhatsApp, il sait utiliser Bus Go.",
  },
  {
    question: "Quels moyens de paiement acceptez-vous ?",
    answer:
      "Nous acceptons Wave, Orange Money, et virement bancaire. Pas de carte bancaire requise. Le paiement se fait mensuellement, directement depuis votre téléphone.",
  },
  {
    question: "Est-ce que Bus Go remplace mon système de billetterie ?",
    answer:
      "Non, Bus Go est complémentaire. Il s'intègre à votre système de billetterie existant. Vous continuez à vendre vos billets comme d'habitude, Bus Go gère uniquement l'embarquement.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-muted/50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0, duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold md:text-4xl text-foreground">
            Questions fréquentes
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
          className="mx-auto mt-12 max-w-3xl"
        >
          <Accordion
            type="single"
            collapsible
            className="rounded-xl border bg-card border-border"
          >
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="px-6 transition-colors hover:bg-muted/50 last:border-b-0"
              >
                <AccordionTrigger className="py-5 text-left text-base font-medium text-foreground">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}