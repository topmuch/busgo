// Bus Go Client Service Worker — Push Notifications with Sound + TTS Actions
const CACHE_NAME = "busgo-v1";
const STATIC_ASSETS = ["/client", "/login", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || new Response("Hors ligne", { status: 503 }));
      return cached || fetchPromise;
    })
  );
});

// ═══════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — Audio statique + actions TTS
// ═══════════════════════════════════════════════════════════
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {
    title: "Bus Go",
    body: "Nouvelle notification",
    type: "system",
  };

  const options = {
    body: data.body || data.message || "Nouvelle notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "busgo-notification",
    requireInteraction: true,

    // AUDIO STATIQUE — Fonctionne écran verrouillé
    sound: "/sounds/notification-company.mp3",
    vibrate: [300, 100, 300],

    // Actions pour déclencher le TTS côté client
    actions: [
      { action: "listen", title: "\uD83D\uDD0A \u00C9couter" },
      { action: "dismiss", title: "Fermer" },
    ],

    data: {
      url: data.url || "/client/voyage",
      type: data.type || "system",
      trajetId: data.trajetId || "",
      ttsMessage: data.ttsMessage || data.body || data.message || "",
    },
  };

  event.waitUntil(self.registration.showNotification(data.title || "Bus Go", options));
});

// ═══════════════════════════════════════════════════════════
// NOTIFICATION CLICK — TTS via message au client
// ═══════════════════════════════════════════════════════════
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  // Si clic sur "Écouter" → ouvre PWA + envoie signal TTS
  if (action === "listen") {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        // Essayer de focus une fenêtre existante et envoyer le signal TTS
        for (const client of clients) {
          if ("focus" in client) {
            client.postMessage({
              type: "TTS_SPEAK",
              message: data.ttsMessage || "",
            });
            return client.focus();
          }
        }
        // Pas de fenêtre existante → ouvrir avec le signal TTS dans l'URL
        const ttsUrl = `${data.url || "/client/voyage"}?tts=1&ttsMessage=${encodeURIComponent(data.ttsMessage || "")}`;
        return self.clients.openWindow(ttsUrl);
      })
    );
    return;
  }

  // Clic sur "Fermer" ou sur le corps de la notification → ouvre la page
  if (action === "dismiss") return;

  const url = data.url || "/client/voyage";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});