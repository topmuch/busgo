"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceNotificationOptions {
  text: string;
  introText?: string;
  lang?: string;
  rate?: number;
  pitch?: number;
}

export function ClientVoiceProvider({ children }: { children: React.ReactNode }) {
  const lastSpokenRef = useRef<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const speak = useCallback(
    (options: VoiceNotificationOptions) => {
      if (!enabled || typeof window === "undefined") return;
      if (!("speechSynthesis" in window)) return;

      const { text, introText, lang = "fr-FR", rate = 0.95, pitch = 1 } = options;
      const fullText = introText ? `${introText}. ${text}` : text;

      if (fullText === lastSpokenRef.current) return;
      lastSpokenRef.current = fullText;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const frVoice = voices.find(
        (v) => v.lang.startsWith("fr") && v.localService
      ) ?? voices.find((v) => v.lang.startsWith("fr"));
      if (frVoice) utterance.voice = frVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [enabled]
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Handle global speak events from child components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<VoiceNotificationOptions>).detail;
      if (detail) speak(detail);
    };
    window.addEventListener("busgo-speak", handler);
    return () => window.removeEventListener("busgo-speak", handler);
  }, [speak]);

  // Handle global stop events
  useEffect(() => {
    const handler = () => stop();
    window.addEventListener("busgo-stop-speaking", handler);
    return () => window.removeEventListener("busgo-stop-speaking", handler);
  }, [stop]);

  return <>{children}</>;
}