// ═══════════════════════════════════════════════════════════════════
// Bus Go Client Service Worker v2 — Push with Sound + TTS Actions
// ═══════════════════════════════════════════════════════════════════
const CACHE_NAME = "busgo-v2";
const STATIC_ASSETS = [
  "/client",
  "/login",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/sounds/notification-company.mp3",
];

// ═══════════════════════════════════════════════════════════
// SOUND MAP
// ═══════════════════════════════════════════════════════════
const SOUND_MAP = {
  "boarding":       "/sounds/notification-company.mp3",
  "departure":      "/sounds/notification-company.mp3",
  "delay":          "/sounds/notification-company.mp3",
  "scan":           "/sounds/notification-company.mp3",
  "system":         "/sounds/notification-company.mp3",
};

// ═══════════════════════════════════════════════════════════
// VIBRATION PATTERNS
// ═══════════════════════════════════════════════════════════
const VIBRATION_MAP = {
  "boarding":       [300, 100, 300],
  "departure":      [500, 100, 500, 100, 500],
  "delay":          [200, 200],
  "scan":           [100],
  "system":         [200, 100, 200],
};

// ═══════════════════════════════════════════════════════════
// Install — pre-cache shell + sounds
// ═══════════════════════════════════════════════════════════
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ═══════════════════════════════════════════════════════════
// Activate — clean old caches
// ═══════════════════════════════════════════════════════════
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ═══════════════════════════════════════════════════════════
// Fetch — stale-while-revalidate (skip /api/)
// ═══════════════════════════════════════════════════════════
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
// PUSH — Audio statique + vibration + actions TTS
//
// Stratégie vocale 0 FCFA :
//   (A) Audio statique MP3 → fonctionne écran verrouillé
//   (B) TTS dynamique via "Écouter" ou auto-TTS si fenêtre visible
// ═══════════════════════════════════════════════════════════
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {
    title: "Bus Go",
    body: "Nouvelle notification",
    type: "system",
  };

  const type = data.type || "system";
  const sound = SOUND_MAP[type] || SOUND_MAP["system"];
  const vibrate = VIBRATION_MAP[type] || VIBRATION_MAP["system"];

  const options = {
    body: data.body || data.message || "Nouvelle notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "busgo-client-" + type,
    requireInteraction: type === "departure",
    renotify: true,

    // (A) AUDIO STATIQUE — Fonctionne écran verrouillé
    sound: sound,
    vibrate: vibrate,

    // Actions pour TTS dynamique
    actions: [
      { action: "listen", title: "\uD83D\uDD0A \u00C9couter" },
      { action: "dismiss", title: "Fermer" },
    ],

    data: {
      url: data.url || "/client",
      type: type,
      trajetId: data.trajetId || "",
      ttsMessage: data.ttsMessage || data.body || data.message || "",
      autoTTS: data.autoTTS !== false,
      timestamp: data.timestamp || Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Bus Go", options)
  );
});

// ═══════════════════════════════════════════════════════════
// NOTIFICATION CLICK — TTS via message au client
// ═══════════════════════════════════════════════════════════
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;
  const url = data.url || "/client";

  // "Écouter" → force TTS signal
  if (action === "listen") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.postMessage({
              type: "TTS_SPEAK",
              message: data.ttsMessage || "",
              alertType: data.type || "system",
              forced: true,
            });
            return client.focus();
          }
        }
        // No window → open with TTS param
        const ttsUrl = `${url}?tts=1&alertType=${encodeURIComponent(data.type || "")}&ttsMessage=${encodeURIComponent(data.ttsMessage || "")}`;
        return self.clients.openWindow(ttsUrl);
      })
    );
    return;
  }

  if (action === "dismiss") return;

  // Body click → focus + auto-TTS
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
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