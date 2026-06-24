// TTS Announcement Engine for Bus Go Display Screens
// Uses Web Speech API (SpeechSynthesis) with ding-dong sound signals

export interface Announcement {
  id: string;
  type: "boarding-open" | "last-call-5" | "last-call-2" | "delay" | "arrival" | "custom";
  text: string;
  trajetId?: string;
  destination?: string;
  time?: string;
  zone?: string;
  minutes?: number;
  spoken: boolean;
  createdAt: number;
}

type AnnouncementListener = (announcement: Announcement) => void;

class TTSEngine {
  private synth: SpeechSynthesis | null = null;
  private lang = "fr-FR";
  private rate = 0.9;
  private pitch = 1.0;
  private volume = 1.0;
  private isSpeaking = false;
  private queue: Announcement[] = [];
  private listeners: Set<AnnouncementListener> = new Set();
  private announcedIds: Set<string> = new Set();
  private lastAnnouncementTimes: Map<string, number> = new Map();
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
    }
  }

  setLanguage(lang: string) {
    this.lang = lang;
  }

  setRate(rate: number) {
    this.rate = rate;
  }

  setPitch(pitch: number) {
    this.pitch = pitch;
  }

  setVolume(volume: number) {
    this.volume = volume;
  }

  onAnnouncement(listener: AnnouncementListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(announcement: Announcement) {
    this.listeners.forEach((fn) => fn(announcement));
  }

  // Play ding-dong chime before announcement
  private async playChime(): Promise<void> {
    return new Promise((resolve) => {
      try {
        // Cast window to a type that includes the legacy webkitAudioContext
        // property (Safari < 14). Modern browsers expose AudioContext directly.
        const AudioCtx = window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        // First ding (high)
        this.playTone(ctx, 830, 0.25, 0.3, ctx.currentTime);
        // Second dong (lower, slightly delayed)
        this.playTone(ctx, 660, 0.25, 0.3, ctx.currentTime + 0.35);
        // Resolve after chime finishes
        setTimeout(resolve, 800);
      } catch {
        resolve();
      }
    });
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    attack: number,
    duration: number,
    startTime: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = freq;
    osc.type = "sine";

    // Envelope: quick attack, smooth decay
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(this.volume * 0.5, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  // Speak text using Web Speech API
  speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.lang;
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;

      // Try to find a French voice
      const voices = this.synth.getVoices();
      const frVoice = voices.find(
        (v) => v.lang.startsWith("fr") && v.localService
      );
      if (frVoice) {
        utterance.voice = frVoice;
      }

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        resolve();
      };

      this.isSpeaking = true;
      this.synth.speak(utterance);
    });
  }

  // Full announcement: chime + speak
  async announce(announcement: Announcement): Promise<void> {
    if (this.isSpeaking) return;

    this.isSpeaking = true;
    announcement.spoken = true;
    this.announcedIds.add(announcement.id);
    this.notifyListeners(announcement);

    try {
      await this.playChime();
      await this.speak(announcement.text);
    } finally {
      this.isSpeaking = false;
    }
  }

  // Generate announcement text from trigger type
  static buildText(type: Announcement["type"], data: {
    destination?: string;
    time?: string;
    zone?: string;
    minutes?: number;
    passengerName?: string;
    origin?: string;
    customText?: string;
  }): string {
    switch (type) {
      case "boarding-open":
        return `Le bus pour ${data.destination}, depart a ${data.time}, embarquement ${data.zone ? "zone " + data.zone : "maintenant"}. Merci de vous diriger vers ${data.zone || "le quai"}.`;

      case "last-call-5":
        return `Dernier appel pour le bus de ${data.destination}, depart dans 5 minutes. Merci de vous diriger vers ${data.zone || "votre quai"}.`;

      case "last-call-2":
        return data.passengerName
          ? `${data.passengerName}, dernier appel, votre bus pour ${data.destination} part dans 2 minutes.`
          : `Dernier appel, le bus pour ${data.destination} part dans 2 minutes.`;

      case "delay":
        return `Le bus pour ${data.destination} est retarde de ${data.minutes} minutes. Nouvelle heure de depart prevue : ${data.time}. Nous vous prions de nous excuser pour ce contretemps.`;

      case "arrival":
        return `Le bus en provenance de ${data.origin} arrive a quai ${data.zone || "maintenant"}. Merci de rester en zone d'attente.`;

      case "custom":
        return data.customText || "";

      default:
        return "";
    }
  }

  // Check trajets and trigger timed announcements
  startAutoAnnouncements(trajets: Array<{
    id: string;
    destination: string;
    time: string;
    date: string;
    status: string;
    zone: string | null;
  }>) {
    if (this.checkInterval) clearInterval(this.checkInterval);

    // Check every 10 seconds
    this.checkInterval = setInterval(() => {
      const now = new Date();

      for (const trajet of trajets) {
        if (trajet.status === "departed" || trajet.status === "arrived" || trajet.status === "cancelled") continue;

        // Parse departure time
        const [h, m] = trajet.time.split(":").map(Number);
        const departure = new Date(trajet.date);
        departure.setHours(h, m, 0, 0);
        const diffMs = departure.getTime() - now.getTime();
        const diffMin = diffMs / 60000;

        const annId15 = `${trajet.id}-t15`;
        const annId5 = `${trajet.id}-t5`;
        const annId2 = `${trajet.id}-t2`;
        const annIdBoarding = `${trajet.id}-boarding`;

        // T-15 minutes: boarding open
        if (diffMin <= 15 && diffMin > 5 && !this.announcedIds.has(annId15)) {
          const ann: Announcement = {
            id: annId15,
            type: "boarding-open",
            text: TTSEngine.buildText("boarding-open", {
              destination: trajet.destination,
              time: trajet.time,
              zone: trajet.zone || undefined,
            }),
            trajetId: trajet.id,
            destination: trajet.destination,
            time: trajet.time,
            zone: trajet.zone || undefined,
            spoken: false,
            createdAt: Date.now(),
          };
          this.announce(ann);
        }

        // T-5 minutes: last call
        if (diffMin <= 5 && diffMin > 2 && !this.announcedIds.has(annId5)) {
          const ann: Announcement = {
            id: annId5,
            type: "last-call-5",
            text: TTSEngine.buildText("last-call-5", {
              destination: trajet.destination,
              zone: trajet.zone || undefined,
            }),
            trajetId: trajet.id,
            destination: trajet.destination,
            zone: trajet.zone || undefined,
            minutes: 5,
            spoken: false,
            createdAt: Date.now(),
          };
          this.announce(ann);
        }

        // T-2 minutes: final call
        if (diffMin <= 2 && diffMin > -1 && !this.announcedIds.has(annId2)) {
          const ann: Announcement = {
            id: annId2,
            type: "last-call-2",
            text: TTSEngine.buildText("last-call-2", {
              destination: trajet.destination,
            }),
            trajetId: trajet.id,
            destination: trajet.destination,
            minutes: 2,
            spoken: false,
            createdAt: Date.now(),
          };
          this.announce(ann);
        }
      }
    }, 10000);
  }

  stopAutoAnnouncements() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Reset announced IDs (e.g. on data refresh)
  resetAnnouncements() {
    this.announcedIds.clear();
  }

  // Get last displayed announcement text
  getLastText(): string | null {
    if (this.announcedIds.size === 0) return null;
    // Return the most recent one
    return null;
  }

  destroy() {
    this.stopAutoAnnouncements();
    this.synth?.cancel();
    this.listeners.clear();
  }
}

// Singleton
let instance: TTSEngine | null = null;

export function getTTSEngine(): TTSEngine {
  if (!instance) {
    instance = new TTSEngine();
  }
  return instance;
}