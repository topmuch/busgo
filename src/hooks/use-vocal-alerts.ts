"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface VocalConfig {
  enabled: boolean;
  volume: number;         // 0 à 1
  speed: number;          // 0.5 à 2
  forceSound: boolean;    // Contourner le mode silencieux via AudioContext
  chimeEnabled: boolean;  // Sonnerie ding-dong avant TTS
  dedupCooldown: number;  // secondes entre deux alertes identiques (0 = pas de cooldown)
  autoTTS: boolean;       // Auto-TTS quand la page est visible (sans clic "Écouter")
  alerts: {
    passagerManquant: boolean;
    timer5min: boolean;
    timer2min: boolean;
    messageRetard: boolean;
    departConfirme: boolean;
  };
}

export interface VocalAlertEvent {
  type: "passager:manquant" | "timer:5min" | "timer:2min" | "message:retard" | "depart:confirme";
  payload: Record<string, unknown>;
  timestamp: string;
}

const STORAGE_KEY = "busgo-vocal-config";

const DEFAULT_CONFIG: VocalConfig = {
  enabled: true,
  volume: 1.0,
  speed: 0.9,
  forceSound: false,
  chimeEnabled: true,
  dedupCooldown: 5,
  autoTTS: true,
  alerts: {
    passagerManquant: true,
    timer5min: true,
    timer2min: true,
    messageRetard: true,
    departConfirme: true,
  },
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function loadConfig(): VocalConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored), alerts: { ...DEFAULT_CONFIG.alerts, ...(JSON.parse(stored).alerts || {}) } };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_CONFIG;
}

function saveConfig(config: VocalConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore quota errors
  }
}

// ═══════════════════════════════════════════════════════════
// CHIME — ding-dong sonore via AudioContext (0 FCFA)
// ═══════════════════════════════════════════════════════════

async function playChime(audioCtx: AudioContext | null, volume: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = audioCtx || new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();

      // First ding (high — 830 Hz)
      playTone(ctx, 830, 0.2, 0.25, ctx.currentTime, volume * 0.4);
      // Second dong (lower — 660 Hz, slightly delayed)
      playTone(ctx, 660, 0.2, 0.3, ctx.currentTime + 0.3, volume * 0.4);

      setTimeout(resolve, 700);
    } catch {
      resolve();
    }
  });
}

function playTone(
  ctx: AudioContext,
  freq: number,
  attack: number,
  duration: number,
  startTime: number,
  maxGain: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.value = freq;
  osc.type = "sine";

  // Quick attack, smooth exponential decay
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(maxGain, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

export function useVocalAlerts(socketRef: React.RefObject<Socket | null>) {
  const [config, setConfig] = useState<VocalConfig>(DEFAULT_CONFIG);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSpoken, setLastSpoken] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const configRef = useRef<VocalConfig>(DEFAULT_CONFIG);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ttsCheckedRef = useRef(false);
  const dedupMapRef = useRef<Map<string, number>>(new Map()); // type → last timestamp
  const speakingRef = useRef(false);

  // ── Load config from localStorage on mount ──────────────
  useEffect(() => {
    const loaded = loadConfig();
    setConfig(loaded);
    configRef.current = loaded;
  }, []);

  // ── Check TTS availability (voices load async in some browsers) ─
  useEffect(() => {
    if (ttsCheckedRef.current) return;

    const checkVoices = () => {
      if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") {
        setTtsAvailable(false);
        ttsCheckedRef.current = true;
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setTtsAvailable(true);
        setAvailableVoices(voices);
        ttsCheckedRef.current = true;
      }
    };

    checkVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", checkVoices);
    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", checkVoices);
    };
  }, []);

  // ── Show warning toast once if TTS unavailable ──────────
  useEffect(() => {
    if (ttsCheckedRef.current && !ttsAvailable && config.enabled) {
      toast.warning("Synthèse vocale non disponible sur cet appareil. Les alertes seront visuelles uniquement.");
    }
  }, [ttsAvailable, config.enabled]);

  // ── Listen for TTS_SPEAK messages from Service Worker ───
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "TTS_SPEAK" && event.data.message) {
        const cfg = configRef.current;
        // If forced (user clicked "Écouter"), always speak
        // If not forced, respect autoTTS setting and page visibility
        const shouldSpeak = event.data.forced || (cfg.autoTTS && document.visibilityState === "visible");
        if (shouldSpeak) {
          speak(event.data.message);
        }
      }
    };

    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle URL params for TTS auto-trigger on page open ─
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ttsMessage = params.get("ttsMessage");
    if (ttsMessage && params.get("tts") === "1") {
      // Small delay to let TTS voices load
      const timer = setTimeout(() => speak(decodeURIComponent(ttsMessage)), 800);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Page Visibility: pause/resume TTS when tab changes ─
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibility = () => {
      // Chrome bug: speechSynthesis pauses when tab is hidden
      // Resume when tab becomes visible again
      if (document.visibilityState === "visible" && speakingRef.current) {
        window.speechSynthesis?.resume();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // ═══════════════════════════════════════════════════════
  // Core TTS Engine
  // ═══════════════════════════════════════════════════════

  const speak = useCallback((text: string) => {
    const cfg = configRef.current;
    if (!cfg.enabled) return;
    if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") return;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    // CANCEL all previous utterances to avoid stacking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = cfg.speed;
    utterance.volume = cfg.forceSound ? 1.0 : cfg.volume;
    utterance.pitch = 1.0;

    // Prefer a French voice (local first, then any French)
    const frVoice = voices.find((v) => v.lang.startsWith("fr") && v.localService)
      || voices.find((v) => v.lang.startsWith("fr"));
    if (frVoice) utterance.voice = frVoice;

    utterance.onstart = () => {
      speakingRef.current = true;
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      speakingRef.current = false;
      setIsSpeaking(false);
      setLastSpoken("");
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      setIsSpeaking(false);
      setLastSpoken("");
    };

    setLastSpoken(text);
    window.speechSynthesis.speak(utterance);
  }, []);

  // ═══════════════════════════════════════════════════════
  // speakWithChime — chime + TTS combined
  // ═══════════════════════════════════════════════════════

  const speakWithChime = useCallback(async (text: string) => {
    const cfg = configRef.current;
    if (!cfg.enabled) return;
    if (typeof window === "undefined") return;

    // Play chime first (if enabled)
    if (cfg.chimeEnabled) {
      await playChime(audioContextRef.current, cfg.volume);
    }

    // Then TTS
    speak(text);
  }, [speak]);

  // ═══════════════════════════════════════════════════════
  // Alert message builders
  // ═══════════════════════════════════════════════════════

  const buildMessage = useCallback((type: VocalAlertEvent["type"], payload: Record<string, unknown>): string => {
    switch (type) {
      case "passager:manquant":
        return `Attention passager manquant. Siège ${payload.seatNumber || ""}, ${payload.clientName || "Inconnu"}. Téléphone : ${payload.clientPhone || "Non renseigné"}.`;

      case "timer:5min": {
        const count = (payload.missingCount as number) ?? 1;
        return `Attention départ dans 5 minutes. ${count} passager${count > 1 ? "s" : ""} manquant${count > 1 ? "s" : ""}.`;
      }

      case "timer:2min": {
        const names = (payload.missingList as string[]) || [];
        const list = names.length > 0 ? names.join(", ") : "aucun";
        return `Dernier appel ! Départ dans 2 minutes. Passagers manquants : ${list}.`;
      }

      case "message:retard":
        return `Message de ${payload.clientName || "Un passager"}. Il arrive dans ${payload.minutes || "quelques"} minutes. Siège ${payload.seatNumber || ""}.`;

      case "depart:confirme": {
        const boarded = payload.boardedCount ?? 0;
        const missing = payload.missingCount ?? 0;
        return `Départ confirmé. ${boarded} embarqués. ${missing} manquants. Bon voyage !`;
      }

      default:
        return "";
    }
  }, []);

  // ═══════════════════════════════════════════════════════
  // Dedup check — avoid speaking the same alert type within cooldown
  // ═══════════════════════════════════════════════════════

  const isDeduped = useCallback((type: string): boolean => {
    const cfg = configRef.current;
    if (cfg.dedupCooldown <= 0) return false;

    const now = Date.now();
    const lastTime = dedupMapRef.current.get(type) || 0;
    const cooldownMs = cfg.dedupCooldown * 1000;

    if (now - lastTime < cooldownMs) {
      return true; // deduped
    }

    dedupMapRef.current.set(type, now);
    return false;
  }, []);

  // ═══════════════════════════════════════════════════════
  // Map socket events to alert types
  // ═══════════════════════════════════════════════════════

  const alertTypeMap: Record<string, VocalAlertEvent["type"]> = {
    "passager:manquant": "passager:manquant",
    "timer:5min": "timer:5min",
    "timer:2min": "timer:2min",
    "message:retard": "message:retard",
    "depart:confirme": "depart:confirme",
  };

  const alertConfigKey: Record<VocalAlertEvent["type"], keyof VocalConfig["alerts"]> = {
    "passager:manquant": "passagerManquant",
    "timer:5min": "timer5min",
    "timer:2min": "timer2min",
    "message:retard": "messageRetard",
    "depart:confirme": "departConfirme",
  };

  // ═══════════════════════════════════════════════════════
  // Socket event listeners
  // ═══════════════════════════════════════════════════════

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleVocalEvent = (event: string, payload: Record<string, unknown>) => {
      const alertType = alertTypeMap[event];
      if (!alertType) return;

      const cfg = configRef.current;
      if (!cfg.enabled) return;
      if (!cfg.alerts[alertConfigKey[alertType]]) return;

      // Dedup check
      if (isDeduped(alertType)) return;

      // Only speak if page is visible (or forceSound is on for critical alerts)
      if (document.visibilityState !== "visible") return;

      const message = buildMessage(alertType, payload);
      if (message) speakWithChime(message);
    };

    socket.on("passager:manquant", (data: Record<string, unknown>) =>
      handleVocalEvent("passager:manquant", data)
    );
    socket.on("timer:5min", (data: Record<string, unknown>) =>
      handleVocalEvent("timer:5min", data)
    );
    socket.on("timer:2min", (data: Record<string, unknown>) =>
      handleVocalEvent("timer:2min", data)
    );
    socket.on("message:retard", (data: Record<string, unknown>) =>
      handleVocalEvent("message:retard", data)
    );
    socket.on("depart:confirme", (data: Record<string, unknown>) =>
      handleVocalEvent("depart:confirme", data)
    );

    return () => {
      socket.off("passager:manquant");
      socket.off("timer:5min");
      socket.off("timer:2min");
      socket.off("message:retard");
      socket.off("depart:confirme");
    };
  }, [socketRef, speakWithChime, buildMessage, isDeduped]);

  // ═══════════════════════════════════════════════════════
  // Config updaters
  // ═══════════════════════════════════════════════════════

  const updateConfig = useCallback((partial: Partial<VocalConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      if (partial.alerts) {
        next.alerts = { ...prev.alerts, ...partial.alerts };
      }
      configRef.current = next;
      saveConfig(next);
      return next;
    });
  }, []);

  const toggleAlert = useCallback((key: keyof VocalConfig["alerts"]) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        alerts: { ...prev.alerts, [key]: !prev.alerts[key] },
      };
      configRef.current = next;
      saveConfig(next);
      return next;
    });
  }, []);

  // ═══════════════════════════════════════════════════════
  // Force sound: AudioContext unlock + lifecycle
  // ═══════════════════════════════════════════════════════

  const initForceSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
    } catch {
      // AudioContext not available
    }
  }, []);

  // ═══════════════════════════════════════════════════════
  // Stop speaking
  // ═══════════════════════════════════════════════════════

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      speakingRef.current = false;
      setIsSpeaking(false);
      setLastSpoken("");
    }
  }, []);

  // ═══════════════════════════════════════════════════════
  // Test alert
  // ═══════════════════════════════════════════════════════

  const testAlert = useCallback(() => {
    speakWithChime("Ceci est un test d'alerte vocale Bus Go. Départ dans 5 minutes.");
  }, [speakWithChime]);

  // ═══════════════════════════════════════════════════════
  // Cleanup on unmount
  // ═══════════════════════════════════════════════════════

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    config,
    ttsAvailable,
    isSpeaking,
    lastSpoken,
    availableVoices,
    updateConfig,
    toggleAlert,
    speak,
    speakWithChime,
    stopSpeaking,
    testAlert,
    initForceSound,
  };
}