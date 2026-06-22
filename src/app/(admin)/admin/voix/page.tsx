"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Upload,
  Play,
  Pause,
  Save,
  Volume2,
  Clock,
  Bell,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface VoiceConfig {
  id?: string;
  tenantId?: string;
  introText: string | null;
  language: string | null;
  audioUrl: string | null;
  announceT15: boolean;
  announceT5: boolean;
  announceT2: boolean;
  announceDelay: boolean;
  announceArrival: boolean;
}

const DEFAULT_INTRO = "Ici [Nom compagnie], votre compagnie de confiance...";
const MAX_CHARS = 500;

const ANNOUNCEMENT_TYPES = [
  {
    key: "announceT15" as const,
    label: "Annonce T-15 min",
    description: "Annonce automatique 15 minutes avant le départ du bus.",
  },
  {
    key: "announceT5" as const,
    label: "Dernier appel T-5 min",
    description: "Dernier rappel 5 minutes avant le départ.",
  },
  {
    key: "announceT2" as const,
    label: "Dernier appel T-2 min",
    description: "Dernier appel urgent 2 minutes avant le départ.",
  },
  {
    key: "announceDelay" as const,
    label: "Annonce de retard",
    description: "Notification vocale en cas de retard du trajet.",
  },
  {
    key: "announceArrival" as const,
    label: "Annonce d'arrivée",
    description: "Annonce à l'approche de la destination.",
  },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function VoixPage() {
  // Config
  const [config, setConfig] = useState<VoiceConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Intro text
  const [introText, setIntroText] = useState(DEFAULT_INTRO);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Saving
  const [saving, setSaving] = useState(false);

  // Toggles
  const [toggles, setToggles] = useState({
    announceT15: true,
    announceT5: true,
    announceT2: true,
    announceDelay: true,
    announceArrival: true,
  });

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Fetch config ─────────────────────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/voice");
      if (!res.ok) throw new Error();
      const data: VoiceConfig = await res.json();
      setConfig(data);

      if (data.introText) setIntroText(data.introText);
      if (data.audioUrl) setAudioUrl(data.audioUrl);

      setToggles({
        announceT15: data.announceT15 ?? true,
        announceT5: data.announceT5 ?? true,
        announceT2: data.announceT2 ?? true,
        announceDelay: data.announceDelay ?? true,
        announceArrival: data.announceArrival ?? true,
      });
    } catch {
      // Config may not exist yet — use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl && audioBlob) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  // ─── Audio playback ──────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => setAudioPlaying(false);
    const onPlay = () => setAudioPlaying(true);
    const onPause = () => setAudioPlaying(false);

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [audioUrl]);

  // ─── Save intro text ─────────────────────────────────────────────────
  const saveIntroText = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/voice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ introText }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Texte d'introduction enregistré", variant: "default" });
      fetchConfig();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le texte.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [introText, fetchConfig]);

  // ─── Recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        if (audioUrl && audioBlob) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch {
      toast({
        title: "Microphone inaccessible",
        description: "Veuillez autoriser l'accès au microphone.",
        variant: "destructive",
      });
    }
  }, [audioUrl, audioBlob]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ─── Play / Pause ────────────────────────────────────────────────────
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [audioPlaying]);

  // ─── Save recording (upload) ─────────────────────────────────────────
  const saveRecording = useCallback(async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, `recording-${Date.now()}.webm`);

      // Simulated progress with XHR for real progress tracking
      const xhr = new XMLHttpRequest();
      const uploadUrl = "/api/admin/voice/upload";

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("Upload failed"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("POST", uploadUrl);
        xhr.send(formData);
      });

      const result = JSON.parse(xhr.responseText);

      // Update the voice config with the new audio URL
      await fetch("/api/admin/voice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: result.audioUrl }),
      });

      toast({ title: "Enregistrement sauvegardé" });
      fetchConfig();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'enregistrement.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [audioBlob, fetchConfig]);

  // ─── File upload ─────────────────────────────────────────────────────
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("audio/")) {
        toast({
          title: "Fichier invalide",
          description: "Veuillez sélectionner un fichier audio (MP3, WAV, OGG, WebM).",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "Taille maximale : 10 Mo.",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append("audio", file);

        const xhr = new XMLHttpRequest();
        const uploadUrl = "/api/admin/voice/upload";

        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (ev) => {
            if (ev.lengthComputable) {
              setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error("Upload failed"));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Upload failed")));
          xhr.open("POST", uploadUrl);
          xhr.send(formData);
        });

        const result = JSON.parse(xhr.responseText);

        // Create a local preview
        if (audioUrl && audioBlob) URL.revokeObjectURL(audioUrl);
        setAudioBlob(file);
        setAudioUrl(URL.createObjectURL(file));

        // Update server config
        await fetch("/api/admin/voice", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioUrl: result.audioUrl }),
        });

        toast({ title: "Audio téléchargé avec succès" });
        fetchConfig();
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de télécharger le fichier.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [audioUrl, audioBlob, fetchConfig]
  );

  // ─── Toggle announcement ─────────────────────────────────────────────
  const handleToggle = useCallback(
    async (key: keyof typeof toggles) => {
      const next = { ...toggles, [key]: !toggles[key] };
      setToggles(next);

      try {
        const res = await fetch("/api/admin/voice", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: next[key] }),
        });
        if (!res.ok) throw new Error();
      } catch {
        // Revert
        setToggles(toggles);
        toast({
          title: "Erreur",
          description: "Impossible de modifier ce paramètre.",
          variant: "destructive",
        });
      }
    },
    [toggles]
  );

  // ─── Render: Loading skeleton ────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  // ─── Render: Page ────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Volume2 className="h-6 w-6" />
          Configuration vocale
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez les annonces vocales de votre compagnie de transport.
        </p>
      </div>

      {/* ─── Section 1: Intro Text ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Volume2 className="h-5 w-5" />
            Texte d&apos;introduction
          </CardTitle>
          <CardDescription>
            Ce texte sera lu avant chaque annonce vocale automatique.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              placeholder="Ici [Nom compagnie], votre compagnie de confiance..."
              rows={4}
              maxLength={MAX_CHARS}
              className="resize-none"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Utilisez [Nom compagnie] comme variable dynamique.</span>
              <span
                className={
                  introText.length > MAX_CHARS * 0.9
                    ? "text-destructive font-medium"
                    : ""
                }
              >
                {introText.length} / {MAX_CHARS}
              </span>
            </div>
          </div>
          <Button
            onClick={saveIntroText}
            disabled={saving || introText === config?.introText}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer le texte
          </Button>
        </CardContent>
      </Card>

      {/* ─── Section 2: Voice Recording ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="h-5 w-5" />
            Enregistrement vocal
          </CardTitle>
          <CardDescription>
            Enregistrez un message vocal personnalisé pour vos annonces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recording controls */}
          <div className="flex flex-col items-center gap-4">
            {isRecording ? (
              <>
                {/* Pulsing red circle */}
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-red-400 opacity-30" />
                  <span className="absolute inline-flex h-16 w-16 rounded-full bg-red-400 opacity-20" />
                  <Button
                    size="icon"
                    className="h-20 w-20 rounded-full bg-red-500 hover:bg-red-600 text-white"
                    onClick={stopRecording}
                  >
                    <MicOff className="h-8 w-8" />
                  </Button>
                </div>
                {/* Timer */}
                <div className="flex items-center gap-2 text-lg font-mono font-semibold text-red-500">
                  <Clock className="h-4 w-4" />
                  {formatTime(recordingTime)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Enregistrement en cours... Appuyez pour arrêter.
                </p>
              </>
            ) : (
              <Button
                size="icon"
                variant="outline"
                className="h-20 w-20 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={startRecording}
              >
                <Mic className="h-8 w-8 text-muted-foreground" />
              </Button>
            )}
          </div>

          {/* Audio preview & save recording */}
          {audioUrl && !isRecording && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 shrink-0"
                  onClick={togglePlayPause}
                >
                  {audioPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex-1 min-w-0">
                  <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
                  <p className="text-sm font-medium truncate">
                    {audioBlob ? "Enregistrement vocal" : "Audio"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {audioBlob
                      ? `${(audioBlob.size / 1024).toFixed(1)} Ko — audio/webm`
                      : "Fichier audio"}
                  </p>
                </div>
              </div>

              {/* Waveform-like decoration */}
              <div className="flex items-end gap-0.5 h-8 px-1">
                {Array.from({ length: 32 }).map((_, i) => {
                  const h = Math.sin(i * 0.4) * 50 + 50 + Math.random() * 20;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-colors ${
                        audioPlaying
                          ? "bg-primary"
                          : "bg-muted-foreground/25"
                      }`}
                      style={{ height: `${Math.min(h, 100)}%` }}
                    />
                  );
                })}
              </div>

              {/* Save recording button */}
              <Button
                onClick={saveRecording}
                disabled={isUploading}
                className="w-full gap-2"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isUploading
                  ? `Envoi en cours... ${uploadProgress}%`
                  : "Sauvegarder l'enregistrement"}
              </Button>

              {/* Upload progress bar */}
              {isUploading && (
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 3: Audio Upload ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" />
            Télécharger un audio
          </CardTitle>
          <CardDescription>
            Importez un fichier audio pré-enregistré (MP3, WAV, OGG, WebM).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
            id="audio-file-input"
          />
          <Button
            variant="outline"
            className="w-full gap-2 h-24 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <p className="text-sm font-medium">
                Cliquez pour sélectionner un fichier
              </p>
              <p className="text-xs text-muted-foreground">
                MP3, WAV, OGG, WebM — Max 10 Mo
              </p>
            </div>
          </Button>

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Téléchargement...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Current audio preview (server URL) */}
          {config?.audioUrl && !audioBlob && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Volume2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Audio actuel</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {config.audioUrl}
                  </p>
                </div>
                <audio
                  src={config.audioUrl}
                  controls
                  className="h-8 w-40"
                  preload="metadata"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 4: Announcement Toggles ───────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Types d&apos;annonces
          </CardTitle>
          <CardDescription>
            Activez ou désactivez chaque type d&apos;annonce vocale automatique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {ANNOUNCEMENT_TYPES.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={item.key}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {item.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
                <Switch
                  id={item.key}
                  checked={toggles[item.key]}
                  onCheckedChange={() => handleToggle(item.key)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}