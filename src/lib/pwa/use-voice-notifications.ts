"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceNotificationOptions {
  text: string;
  introText?: string;
  lang?: string;
  rate?: number;
  pitch?: number;
}

export function useVoiceNotifications() {
  const isSupportedRef = useRef(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const lastSpokenRef = useRef<string>("");

  useEffect(() => {
    isSupportedRef.current = typeof window !== "undefined" && "speechSynthesis" in window;
    setIsSupported(isSupportedRef.current);
  }, []);

  const speak = useCallback(
    (options: VoiceNotificationOptions) => {
      if (!isSupported || !enabled) return;

      const { text, introText, lang = "fr-FR", rate = 0.95, pitch = 1 } = options;
      const fullText = introText ? `${introText}. ${text}` : text;

      // Avoid speaking the same message twice in a row
      if (fullText === lastSpokenRef.current) return;
      lastSpokenRef.current = fullText;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1;

      // Try to find a French voice
      const voices = window.speechSynthesis.getVoices();
      const frVoice = voices.find(
        (v) => v.lang.startsWith("fr") && v.localService
      ) ?? voices.find((v) => v.lang.startsWith("fr"));
      if (frVoice) {
        utterance.voice = frVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, enabled]
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSupported, isSpeaking, enabled, setEnabled, speak, stop };
}

export type { VoiceNotificationOptions };