// ═══════════════════════════════════════════════════════════════════
// Bus Go Agent Service Worker v4 — Offline-First + Push with Sound
// ═══════════════════════════════════════════════════════════════════
// v4: bumped from v3 → v4 to invalidate old cache (was serving stale
//     /login redirects on navigation, causing auth-redirect loop).
const CACHE_NAME = "busgo-agent-v5"; // bumped from v4 → v5 to enable web-push integration
const STATIC_ASSETS = [
  "/agent/trajets",
  "/agent",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/sounds/notification-company.mp3",
];

// ═══════════════════════════════════════════════════════════
// SOUND MAP — type-based notification sounds (0 FCFA)
// ═══════════════════════════════════════════════════════════
const SOUND_MAP = {
  "passager:manquant":  "/sounds/notification-company.mp3",
  "timer:5min":         "/sounds/notification-company.mp3",
  "timer:2min":         "/sounds/notification-company.mp3",
  "message:retard":     "/sounds/notification-company.mp3",
  "depart:confirme":    "/sounds/notification-company.mp3",
  "system":             "/sounds/notification-company.mp3",
};

// ═══════════════════════════════════════════════════════════
// VIBRATION PATTERNS — distinct per alert type
// ═══════════════════════════════════════════════════════════
const VIBRATION_MAP = {
  "passager:manquant":  [200, 100, 200, 100, 400],  // urgent triple
  "timer:5min":         [300, 150, 300],              // double pulse
  "timer:2min":         [500, 100, 500, 100, 500],   // triple long — critical
  "message:retard":     [200, 200],                   // single soft
  "depart:confirme":    [100, 50, 100, 50, 100, 50, 300], // cheerful staccato
  "system":             [200, 100, 200],              // default double
};

// ═══════════════════════════════════════════════════════════
// ICON MAP — badge icon per type
// ═══════════════════════════════════════════════════════════
const ICON_MAP = {
  "passager:manquant":  "/icons/icon-192.png",
  "timer:5min":         "/icons/icon-192.png",
  "timer:2min":         "/icons/icon-192.png",
  "message:retard":     "/icons/icon-192.png",
  "depart:confirme":    "/icons/icon-192.png",
  "system":             "/icons/icon-192.png",
};

// ═══════════════════════════════════════════════════════════
// Install — pre-cache shell + sound assets
// ═══════════════════════════════════════════════════════════
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ═══════════════════════════════════════════════════════════
// Activate — clean old caches (v1, v2)
// ═══════════════════════════════════════════════════════════
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ═══════════════════════════════════════════════════════════
// Fetch — network-first for API, cache-first for static + sounds
// ═══════════════════════════════════════════════════════════
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

  // Static assets + sounds: cache-first (pre-cached on install)
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

  // Navigation requests: network-first, NEVER cache non-200 responses
  // (caching 307 redirects to /login was causing the auth-redirect loop)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful 200 responses — never cache redirects
          // (307 to /login) or errors, otherwise the SW will serve the
          // cached redirect forever and the user can never log in.
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match("/agent/trajets")
          )
        )
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ═══════════════════════════════════════════════════════════
// Background Sync — offline scan queue
// ═══════════════════════════════════════════════════════════
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
// PUSH — Type-based sound + vibration + TTS actions
//
// Stratégie vocale 0 FCFA :
//   (A) Audio statique MP3 dans la push → fonctionne écran verrouillé
//   (B) TTS dynamique via "Écouter" ou auto-TTS si fenêtre visible
// ═══════════════════════════════════════════════════════════
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const type = data.type || "system";
  const title = data.title || "Bus Go Agent";
  const sound = SOUND_MAP[type] || SOUND_MAP["system"];
  const vibrate = VIBRATION_MAP[type] || VIBRATION_MAP["system"];

  const options = {
    body: data.body || data.message || "Nouvelle alerte",
    icon: ICON_MAP[type] || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "busgo-agent-" + type,  // per-type tag: last one replaces
    requireInteraction: type === "timer:2min" || type === "passager:manquant",
    renotify: true,

    // (A) AUDIO STATIQUE — Fonctionne écran verrouillé
    sound: sound,
    vibrate: vibrate,

    // Actions
    actions: [
      { action: "listen", title: "\uD83D\uDD0A \u00C9couter" },
      { action: "dismiss", title: "Fermer" },
    ],

    data: {
      url: data.url || "/agent/trajets",
      type: type,
      trajetId: data.trajetId || "",
      ttsMessage: data.ttsMessage || data.body || data.message || "",
      autoTTS: data.autoTTS !== false,  // default: auto-TTS if window visible
      timestamp: data.timestamp || Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ═══════════════════════════════════════════════════════════
// NOTIFICATION CLICK — Smart routing:
//   "Écouter" → TTS au client focusé (ou auto-TTS si visible)
//   body click → focus/ouvrir la page agent + auto-TTS si visible
// ═══════════════════════════════════════════════════════════
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action;
  const url = data.url || "/agent/trajets";

  // "Écouter" → force TTS signal to client
  if (action === "listen") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        // Try to find an agent window and send TTS_SPEAK
        for (const client of clients) {
          if (client.url.includes("/agent/") && "focus" in client) {
            client.postMessage({
              type: "TTS_SPEAK",
              message: data.ttsMessage || "",
              alertType: data.type || "system",
              forced: true,  // user explicitly clicked "Écouter"
            });
            return client.focus();
          }
        }
        // No agent window open → open with TTS query param
        const ttsUrl = `${url}?tts=1&alertType=${encodeURIComponent(data.type || "")}&ttsMessage=${encodeURIComponent(data.ttsMessage || "")}`;
        return self.clients.openWindow(ttsUrl);
      })
    );
    return;
  }

  if (action === "dismiss") return;

  // Body click → focus agent page + send auto-TTS if configured
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/agent/") && "focus" in client) {
          // Auto-TTS: if window is visible and autoTTS is enabled
          if (data.autoTTS && data.ttsMessage) {
            client.postMessage({
              type: "TTS_SPEAK",
              message: data.ttsMessage,
              alertType: data.type || "system",
              forced: false,
            });
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});