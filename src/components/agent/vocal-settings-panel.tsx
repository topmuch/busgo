"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Volume2,
  VolumeX,
  Gauge,
  TestTube2,
  Settings,
  AlertTriangle,
  BellRing,
  Timer,
  Square,
} from "lucide-react";
import type { VocalConfig } from "@/hooks/use-vocal-alerts";

interface VocalSettingsPanelProps {
  config: VocalConfig;
  ttsAvailable: boolean;
  isSpeaking: boolean;
  availableVoices: SpeechSynthesisVoice[]; // built-in browser type
  onUpdateConfig: (partial: Partial<VocalConfig>) => void;
  onToggleAlert: (key: keyof VocalConfig["alerts"]) => void;
  onTestAlert: () => void;
  onStopSpeaking: () => void;
  onInitForceSound: () => void;
}

const alertLabels: { key: keyof VocalConfig["alerts"]; label: string; desc: string; icon: string }[] = [
  { key: "passagerManquant", label: "Passager manquant", desc: "Quand un passager est marqué absent", icon: "⚠️" },
  { key: "timer5min", label: "T-5 minutes", desc: "Rappel 5 min avant le départ", icon: "⏰" },
  { key: "timer2min", label: "T-2 minutes", desc: "Dernier appel avant départ", icon: "🚨" },
  { key: "messageRetard", label: "Message de retard", desc: "Quand un passager signale son retard", icon: "💬" },
  { key: "departConfirme", label: "Départ confirmé", desc: "Annonce quand le départ est validé", icon: "🚌" },
];

export function VocalSettingsPanel({
  config,
  ttsAvailable,
  isSpeaking,
  availableVoices,
  onUpdateConfig,
  onToggleAlert,
  onTestAlert,
  onStopSpeaking,
  onInitForceSound,
}: VocalSettingsPanelProps) {
  // Filter French voices for the selector
  const frVoices = availableVoices.filter((v) => v.lang.startsWith("fr"));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 relative">
          {config.enabled ? (
            isSpeaking ? (
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <Volume2 className="relative h-4 w-4 text-green-600" />
              </span>
            ) : (
              <Volume2 className="h-4 w-4" />
            )
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Voix</span>
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Alertes vocales
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* TTS Availability Warning */}
          {!ttsAvailable && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Synthèse vocale non disponible sur cet appareil.
                Les alertes seront visuelles uniquement.
              </p>
            </div>
          )}

          {/* ═══ Speaking Indicator ═══ */}
          {isSpeaking && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </div>
                <span className="text-sm font-medium text-green-800">
                  Annonce en cours...
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                onClick={onStopSpeaking}
              >
                <Square className="h-3 w-3" />
                Stop
              </Button>
            </div>
          )}

          {/* ═══ Master Toggle ═══ */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Activer les alertes vocales</p>
              <p className="text-xs text-muted-foreground">
                Annonces vocales des événements en temps réel
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => onUpdateConfig({ enabled: checked })}
              disabled={!ttsAvailable}
            />
          </div>

          {config.enabled && ttsAvailable && (
            <>
              <Separator />

              {/* ═══ Voice Selector ═══ */}
              {frVoices.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Voix
                  </label>
                  <Select
                    value={frVoices[0]?.name || ""}
                    onValueChange={(_val) => {
                      // Voice selection is handled by the TTS engine directly
                      // This is informational; voice is auto-selected in the hook
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Voix française automatique" />
                    </SelectTrigger>
                    <SelectContent>
                      {frVoices.map((voice) => (
                        <SelectItem key={voice.name} value={voice.name} className="text-xs">
                          {voice.name}
                          {voice.localService ? " (locale)" : " (cloud)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Voix françaises détectées : {frVoices.length}. La voix locale est prioritaire.
                  </p>
                </div>
              )}

              {/* ═══ Volume ═══ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Volume2 className="h-4 w-4" />
                    Volume
                  </label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(config.volume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[config.volume]}
                  onValueChange={([v]) => onUpdateConfig({ volume: v })}
                  min={0}
                  max={1}
                  step={0.05}
                  disabled={config.forceSound}
                />
              </div>

              {/* ═══ Speed ═══ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Gauge className="h-4 w-4" />
                    Vitesse
                  </label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {config.speed.toFixed(1)}x
                  </span>
                </div>
                <Slider
                  value={[config.speed]}
                  onValueChange={([v]) => onUpdateConfig({ speed: v })}
                  min={0.5}
                  max={2}
                  step={0.1}
                />
              </div>

              <Separator />

              {/* ═══ Chime Toggle ═══ */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <BellRing className="h-4 w-4" />
                    Sonnerie avant annonce
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ding-dong avant chaque alerte vocale
                  </p>
                </div>
                <Switch
                  checked={config.chimeEnabled}
                  onCheckedChange={(checked) => onUpdateConfig({ chimeEnabled: checked })}
                />
              </div>

              {/* ═══ Dedup Cooldown ═══ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Timer className="h-4 w-4" />
                    Délai anti-doublon
                  </label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {config.dedupCooldown}s
                  </span>
                </div>
                <Slider
                  value={[config.dedupCooldown]}
                  onValueChange={([v]) => onUpdateConfig({ dedupCooldown: v })}
                  min={0}
                  max={30}
                  step={1}
                />
                <p className="text-[10px] text-muted-foreground">
                  Temps minimum entre deux alertes du même type. 0 = pas de délai.
                </p>
              </div>

              {/* ═══ Auto-TTS Toggle ═══ */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Lecture automatique</p>
                  <p className="text-xs text-muted-foreground">
                    TTS automatique quand la page est visible
                  </p>
                </div>
                <Switch
                  checked={config.autoTTS}
                  onCheckedChange={(checked) => onUpdateConfig({ autoTTS: checked })}
                />
              </div>

              <Separator />

              {/* ═══ Individual Alert Toggles ═══ */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Types d&apos;alertes</p>
                {alertLabels.map(({ key, label, desc, icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{icon}</span>
                      <div>
                        <p className="text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={config.alerts[key]}
                      onCheckedChange={() => onToggleAlert(key)}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              {/* ═══ Force Sound ═══ */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Forcer le son en mode silencieux</p>
                  <p className="text-xs text-muted-foreground">
                    Utilise AudioContext — nécessite une interaction préalable
                  </p>
                </div>
                <Switch
                  checked={config.forceSound}
                  onCheckedChange={(checked) => {
                    if (checked) onInitForceSound();
                    onUpdateConfig({ forceSound: checked });
                  }}
                />
              </div>

              <Separator />

              {/* ═══ Test Button ═══ */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={onTestAlert}
                disabled={isSpeaking}
              >
                <TestTube2 className="h-4 w-4" />
                Tester l&apos;alerte vocale
              </Button>

              {/* ═══ Strategy Info ═══ */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-[11px] text-muted-foreground">
                <p className="font-medium text-xs text-foreground/70">Stratégie vocale 0 FCFA</p>
                <p><strong>(A) Écran verrouillé :</strong> Son MP3 statique + vibration dans la push notification.</p>
                <p><strong>(B) Écran actif :</strong> TTS dynamique via Web Speech API avec sonnerie ding-dong.</p>
                <p className="text-muted-foreground/70">Aucun service TTS externe facturé — tout est local.</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}