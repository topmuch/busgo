"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface VocalConfig {
  enabled: boolean;
  volume: number;       // 0 à 1
  speed: number;        // 0.5 à 2
  forceSound: boolean;  // Contourner le mode silencieux
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
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
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

/** Check TTS availability */
function isTTSAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    window.speechSynthesis.getVoices().length > 0
  );
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

export function useVocalAlerts(socketRef: React.RefObject<Socket | null>) {
  const [config, setConfig] = useState<VocalConfig>(DEFAULT_CONFIG);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [lastSpoken, setLastSpoken] = useState<string>("");
  const configRef = useRef<VocalConfig>(DEFAULT_CONFIG);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ttsCheckedRef = useRef(false);

  // Load config from localStorage on mount
  useEffect(() => {
    const loaded = loadConfig();
    setConfig(loaded);
    configRef.current = loaded;
  }, []);

  // Check TTS availability (voices load async in some browsers)
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
        ttsCheckedRef.current = true;
      }
    };

    checkVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", checkVoices);
    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", checkVoices);
    };
  }, []);

  // Show warning toast once if TTS unavailable
  useEffect(() => {
    if (ttsCheckedRef.current && !ttsAvailable && config.enabled) {
      toast.warning("Synthèse vocale non disponible sur cet appareil. Les alertes seront visuelles uniquement.");
    }
  }, [ttsAvailable, config.enabled]);

  // Listen for TTS_SPEAK messages from Service Worker
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "TTS_SPEAK" && event.data.message) {
        speak(event.data.message);
      }
    };

    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core TTS Engine ──────────────────────────────────────

  const speak = useCallback((text: string) => {
    if (!configRef.current.enabled) return;
    if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") return;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    // CANCEL all previous utterances to avoid stacking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = configRef.current.speed;
    utterance.volume = configRef.current.forceSound ? 1.0 : configRef.current.volume;
    utterance.pitch = 1.0;

    // Prefer a French voice
    const frVoice = voices.find((v) => v.lang.startsWith("fr"));
    if (frVoice) utterance.voice = frVoice;

    // If forceSound, use AudioContext to unlock audio
    if (configRef.current.forceSound && audioContextRef.current) {
      try {
        const ctx = audioContextRef.current;
        if (ctx.state === "suspended") ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.001; // Inaudible beep just to unlock
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.01);
      } catch {
        // Ignore AudioContext errors
      }
    }

    utterance.onend = () => setLastSpoken("");
    utterance.onerror = () => setLastSpoken("");

    setLastSpoken(text);
    window.speechSynthesis.speak(utterance);
  }, []);

  // ── Alert message builders ────────────────────────────────

  const buildMessage = useCallback((type: VocalAlertEvent["type"], payload: Record<string, unknown>): string => {
    switch (type) {
      case "passager:manquant":
        return `Attention passager manquant. Siège ${payload.seatNumber || ""}, ${payload.clientName || "Inconnu"}. Téléphone : ${payload.clientPhone || "Non renseigné"}.`;

      case "timer:5min": {
        const count = payload.missingCount ?? 1;
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

  // ── Map socket events to alert types ─────────────────────

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

  // ── Socket event listeners ───────────────────────────────

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleVocalEvent = (event: string, payload: Record<string, unknown>) => {
      const alertType = alertTypeMap[event];
      if (!alertType) return;

      const cfg = configRef.current;
      if (!cfg.enabled) return;
      if (!cfg.alerts[alertConfigKey[alertType]]) return;

      const message = buildMessage(alertType, payload);
      if (message) speak(message);
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
  }, [socketRef, speak, buildMessage]);

  // ── Config updaters ──────────────────────────────────────

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

  // ── Force sound: AudioContext unlock ─────────────────────

  const initForceSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      audioContextRef.current = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)();
    } catch {
      // AudioContext not available
    }
  }, []);

  const testAlert = useCallback(() => {
    speak("Ceci est un test d'alerte vocale Bus Go. Départ dans 5 minutes.");
  }, [speak]);

  // ── Cleanup on unmount ───────────────────────────────────

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
    lastSpoken,
    updateConfig,
    toggleAlert,
    speak,
    testAlert,
    initForceSound,
  };
}