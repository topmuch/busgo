// Bus Go Agent Service Worker — Offline-First + Push with Sound
const CACHE_NAME = "busgo-agent-v2";
const STATIC_ASSETS = ["/agent/trajets", "/agent"];

// Install: pre-cache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: network-first, fallback to queue
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(
              JSON.stringify({ error: "Hors ligne", offline: true }),
              { status: 503, headers: { "Content-Type": "application/json" } }
            );
          })
        )
    );
    return;
  }

  // Static assets: cache-first (including sounds)
  if (
    request.method === "GET" &&
    (url.pathname.startsWith("/_next/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/sounds/") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".ico") ||
      url.pathname.endsWith(".mp3") ||
      url.pathname.endsWith(".wav"))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation requests: network-first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/agent/trajets"))
        )
    );
    return;
  }

  // Default: network-first
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// Handle sync events for offline scan queue
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-scans") {
    event.waitUntil(syncOfflineScans());
  }
});

async function syncOfflineScans() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => client.postMessage({ type: "SYNC_SCANS" }));
}

// ═══════════════════════════════════════════════════════════
// PUSH — Audio statique + vibration personnalisée
// ═══════════════════════════════════════════════════════════
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const title = data.title || "Bus Go Agent";

  const options = {
    body: data.body || data.message || "Nouvelle alerte",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "busgo-agent-notification",
    requireInteraction: true,

    // AUDIO STATIQUE — Fonctionne écran verrouillé
    sound: "/sounds/notification-company.mp3",
    vibrate: [300, 100, 300],

    actions: [
      { action: "listen", title: "\uD83D\uDD0A \u00C9couter" },
      { action: "dismiss", title: "Fermer" },
    ],

    data: {
      url: data.url || "/agent/trajets",
      type: data.type || "system",
      trajetId: data.trajetId || "",
      ttsMessage: data.ttsMessage || data.body || data.message || "",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ═══════════════════════════════════════════════════════════
// NOTIFICATION CLICK — TTS signal ou navigation simple
// ═══════════════════════════════════════════════════════════
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action;

  // "Écouter" → envoie signal TTS au client focusé
  if (action === "listen") {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        for (const client of clients) {
          if (client.url.includes("/agent/") && "focus" in client) {
            client.postMessage({
              type: "TTS_SPEAK",
              message: data.ttsMessage || "",
            });
            return client.focus();
          }
        }
        // Pas de fenêtre ouverte → ouvrir avec paramètre TTS
        const ttsUrl = `${data.url}?tts=1&ttsMessage=${encodeURIComponent(data.ttsMessage || "")}`;
        return self.clients.openWindow(ttsUrl);
      })
    );
    return;
  }

  if (action === "dismiss") return;

  // Clic sur le corps → ouvre/focus la page agent
  const url = data.url || "/agent/trajets";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/agent/") && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});