import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { ClientVoiceProvider } from "@/components/client/client-voice-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Bus Go — Gestion d'embarquement intelligente | SaaS bus Afrique",
  description:
    "Ne laissez plus un siège vide au départ. Bus Go aide les compagnies de bus à identifier les passagers absents, les appeler avant le départ et les fidéliser. Taux d'embarquement 91%. 0 FCFA de SMS.",
  keywords: [
    "gestion embarquement",
    "bus Sénégal",
    "compagnie de bus",
    "PWA transport",
    "scan QR code",
    "notifications vocales",
    "Bus Go",
    "transport Afrique",
    "gestion flotte",
    "écrans gare",
  ],
  openGraph: {
    title: "Bus Go — Ne laissez plus un siège vide au départ",
    description:
      "Identifiez les passagers absents, appelez les retardataires et fidélisez vos clients. 91% de taux d'embarquement. Essai gratuit 14 jours.",
    type: "website",
    locale: "fr_SN",
    siteName: "Bus Go",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bus Go — Gestion d'embarquement intelligente",
    description:
      "91% de taux d'embarquement. Notifications vocales gratuites. Essai gratuit 14 jours.",
  },
  icons: {
    icon: "/logo.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bus Go",
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Schema.org SaaS markup */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Bus Go",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "description": "Plateforme SaaS de gestion d'embarquement pour compagnies de bus en Afrique de l'Ouest.",
              "offers": {
                "@type": "AggregateOffer",
                "lowPrice": "15000",
                "highPrice": "35000",
                "priceCurrency": "XOF",
                "offerCount": "2",
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "reviewCount": "127",
              },
            }),
          }}
        />
        <Providers>
          <ClientVoiceProvider>
            {children}
          </ClientVoiceProvider>
        </Providers>
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}