"use client";

import {
  Bus,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Globe,
} from "lucide-react";

const productLinks = [
  "Fonctionnalités",
  "Tarifs",
  "Comment ça marche",
  "Télécharger l'app",
];

const accessLinks = [
  "Connexion Admin",
  "Connexion Agent",
  "Super Admin",
  "Créer un compte",
];

const contactInfo = [
  { icon: Mail, text: "contact@busgo.sn" },
  { icon: Phone, text: "+221 77 123 45 67" },
  { icon: MessageCircle, text: "WhatsApp: +221 77 123 45 67" },
  { icon: MapPin, text: "Dakar, Sénégal" },
];

const legalLinks = ["Mentions légales", "CGU", "Confidentialité"];

const socialIcons = [Globe, Mail, Phone];

export function Footer() {
  return (
    <footer className="bg-gray-900 pb-8 pt-16 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Col 1 - Bus Go */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <Bus className="h-6 w-6 text-orange-500" />
              <span className="text-lg font-bold">Bus Go</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">
              La plateforme de gestion d&apos;embarquement pour les compagnies
              de bus en Afrique de l&apos;Ouest. Simple, efficace, abordable.
            </p>
            <div className="mt-6 flex gap-3">
              {socialIcons.map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 - Produit */}
          <div>
            <h3 className="mb-4 font-semibold">Produit</h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 - Accès */}
          <div>
            <h3 className="mb-4 font-semibold">Accès</h3>
            <ul className="space-y-2">
              {accessLinks.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 - Contact */}
          <div>
            <h3 className="mb-4 font-semibold">Contact</h3>
            <ul className="space-y-3">
              {contactInfo.map((item) => (
                <li key={item.text} className="flex items-start gap-2.5">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span className="text-sm text-gray-400">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-gray-500">
              © 2026 Bus Go. Tous droits réservés.
            </p>
            <div className="flex gap-4">
              {legalLinks.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-sm text-gray-400 transition-colors hover:text-white"
                >
                  {link}
                </a>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              Fait avec ❤️ pour l&apos;Afrique de l&apos;Ouest
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}