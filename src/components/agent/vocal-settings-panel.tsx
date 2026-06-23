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
import { Volume2, VolumeX, Gauge, TestTube2, Settings, AlertTriangle } from "lucide-react";
import type { VocalConfig } from "@/hooks/use-vocal-alerts";

interface VocalSettingsPanelProps {
  config: VocalConfig;
  ttsAvailable: boolean;
  onUpdateConfig: (partial: Partial<VocalConfig>) => void;
  onToggleAlert: (key: keyof VocalConfig["alerts"]) => void;
  onTestAlert: () => void;
  onInitForceSound: () => void;
}

const alertLabels: { key: keyof VocalConfig["alerts"]; label: string; desc: string }[] = [
  { key: "passagerManquant", label: "Passager manquant", desc: "Quand un passager est marqué absent" },
  { key: "timer5min", label: "T-5 minutes", desc: "Rappel 5 min avant le départ" },
  { key: "timer2min", label: "T-2 minutes", desc: "Dernier appel avant départ" },
  { key: "messageRetard", label: "Message de retard", desc: "Quand un passager signale son retard" },
  { key: "departConfirme", label: "Départ confirmé", desc: "Annonce quand le départ est validé" },
];

export function VocalSettingsPanel({
  config,
  ttsAvailable,
  onUpdateConfig,
  onToggleAlert,
  onTestAlert,
  onInitForceSound,
}: VocalSettingsPanelProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {config.enabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Voix</span>
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

          {/* Master Toggle */}
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

              {/* Volume */}
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

              {/* Speed */}
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

              {/* Individual Alert Toggles */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Types d&apos;alertes</p>
                {alertLabels.map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={config.alerts[key]}
                      onCheckedChange={() => onToggleAlert(key)}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              {/* Force Sound */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Forcer le son en mode silencieux</p>
                  <p className="text-xs text-muted-foreground">
                    Nécessite une interaction utilisateur préalable
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

              {/* Test Button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={onTestAlert}
              >
                <TestTube2 className="h-4 w-4" />
                Tester l&apos;alerte vocale
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}