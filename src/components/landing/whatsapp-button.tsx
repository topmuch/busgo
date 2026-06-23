"use client";

import { MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="bg-card rounded-xl shadow-lg border border-border px-4 py-3 max-w-[220px]"
          >
            <p className="text-sm font-medium text-foreground">
              Besoin d&apos;aide ?
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Écrivez-nous sur WhatsApp. Réponse en moins de 5 min.
            </p>
            <div className="absolute bottom-0 right-6 translate-y-1/2 rotate-45 w-3 h-3 bg-card border-r border-b border-border" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: "spring", stiffness: 200 }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => {
          window.open(
            "https://wa.me/221771234567?text=Bonjour%20Bus%20Go%2C%20je%20souhaite%20en%20savoir%20plus.",
            "_blank"
          );
        }}
        className="group relative w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center transition-colors duration-200 hover:scale-110 active:scale-95"
        aria-label="Contacter via WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />

        {/* Ping ring */}
        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20" />
      </motion.button>
    </div>
  );
}