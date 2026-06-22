"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Settings, Bell, Mic, FileText, Save, Pencil,
} from "lucide-react";
import { toast } from "sonner";

interface SysLog {
  id: string;
  level: string;
  action: string;
  message: string;
  createdAt: string;
}

interface NotifTemplate {
  id: string;
  type: string;
  event: string;
  subject: string | null;
  body: string;
  isActive: boolean;
}

interface VoiceCfg {
  id: string;
  tenant: { name: string; slug: string };
  introText: string;
  language: string;
  announceT15: boolean;
  announceT5: boolean;
  announceT2: boolean;
  announceDelay: boolean;
  announceArrival: boolean;
}

const eventLabels: Record<string, string> = {
  boarding_reminder: "Rappel d'embarquement",
  delay_alert: "Retard signalé",
  arrival_notice: "Arrivée à destination",
  payment_reminder: "Rappel de paiement",
  welcome: "Bienvenue",
  subscription_expiry: "Fin d'abonnement",
};

const logLevelColors: Record<string, string> = {
  info: "bg-sky-100 text-sky-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-rose-100 text-rose-700",
};

export default function SettingsPage() {
  const [logs, setLogs] = useState<SysLog[]>([]);
  const [templates, setTemplates] = useState<NotifTemplate[]>([]);
  const [voiceConfigs, setVoiceConfigs] = useState<VoiceCfg[]>([]);
  const [loading, setLoading] = useState(true);
  const [logFilter, setLogFilter] = useState("all");
  const [editTemplate, setEditTemplate] = useState<NotifTemplate | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSubject, setEditSubject] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, templatesRes, voiceRes] = await Promise.all([
        fetch("/api/superadmin/settings?section=logs"),
        fetch("/api/superadmin/settings?section=templates"),
        fetch("/api/superadmin/settings?section=voice-configs"),
      ]);
      const [logsData, templatesData, voiceData] = await Promise.all([
        logsRes.json(), templatesRes.json(), voiceRes.json(),
      ]);
      setLogs(logsData);
      setTemplates(templatesData);
      setVoiceConfigs(voiceData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const filteredLogs = logFilter === "all" ? logs : logs.filter((l) => l.level === logFilter);

  const openEditTemplate = (tpl: NotifTemplate) => {
    setEditTemplate(tpl);
    setEditBody(tpl.body);
    setEditSubject(tpl.subject || "");
  };

  const saveTemplate = async () => {
    if (!editTemplate) return;
    await fetch("/api/superadmin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "template", data: { id: editTemplate.id, body: editBody, subject: editSubject } }),
    });
    toast.success("Template mis à jour");
    setEditTemplate(null);
    fetchSettings();
  };

  const toggleTemplate = async (tpl: NotifTemplate) => {
    await fetch("/api/superadmin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "template", data: { id: tpl.id, isActive: !tpl.isActive } }),
    });
    toast.success(tpl.isActive ? "Template désactivé" : "Template activé");
    fetchSettings();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
        <p className="text-muted-foreground">Paramètres globaux, templates et logs système.</p>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates" className="gap-1.5 text-xs">
            <Bell className="h-3.5 w-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="tts" className="gap-1.5 text-xs">
            <Mic className="h-3.5 w-3.5" /> TTS
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Logs
          </TabsTrigger>
        </TabsList>

        {/* Notification Templates */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates de notifications</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Événement</TableHead>
                    <TableHead className="text-xs">Sujet</TableHead>
                    <TableHead className="text-xs">Contenu</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tpl) => (
                    <TableRow key={tpl.id}>
                      <TableCell><Badge variant="outline" className="text-[10px]">{tpl.type}</Badge></TableCell>
                      <TableCell className="text-xs font-medium">{eventLabels[tpl.event] || tpl.event}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tpl.subject || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{tpl.body}</TableCell>
                      <TableCell>
                        <Switch checked={tpl.isActive} onCheckedChange={() => toggleTemplate(tpl)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditTemplate(tpl)}>
                          <Pencil className="h-3 w-3 mr-1" /> Modifier
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TTS Configs */}
        <TabsContent value="tts">
          <div className="grid gap-4">
            {voiceConfigs.map((vc) => (
              <Card key={vc.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Mic className="h-4 w-4 text-violet-600" />
                    {vc.tenant.name} <Badge variant="outline" className="text-[10px]">{vc.language}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Texte d&apos;introduction</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{vc.introText}</p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <Badge variant={vc.announceT15 ? "default" : "secondary"} className="text-[10px]">T-15 min</Badge>
                    <Badge variant={vc.announceT5 ? "default" : "secondary"} className="text-[10px]">T-5 min</Badge>
                    <Badge variant={vc.announceT2 ? "default" : "secondary"} className="text-[10px]">T-2 min</Badge>
                    <Badge variant={vc.announceDelay ? "default" : "secondary"} className="text-[10px]">Retard</Badge>
                    <Badge variant={vc.announceArrival ? "default" : "secondary"} className="text-[10px]">Arrivée</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {voiceConfigs.length === 0 && (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Aucune configuration TTS trouvée.</CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* System Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Logs système</CardTitle>
              <div className="flex gap-2">
                {["all", "info", "warning", "error"].map((f) => (
                  <Button
                    key={f}
                    variant={logFilter === f ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setLogFilter(f)}
                  >
                    {f === "all" ? "Tous" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-20">Niveau</TableHead>
                      <TableHead className="text-xs w-28">Action</TableHead>
                      <TableHead className="text-xs">Message</TableHead>
                      <TableHead className="text-xs w-36">Entreprise</TableHead>
                      <TableHead className="text-xs w-36">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge className={`text-[10px] ${logLevelColors[log.level] || ""}`}>{log.level}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{log.action}</TableCell>
                        <TableCell className="text-sm">{log.message}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">—</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredLogs.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Aucun log trouvé.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Template Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => { if (!open) setEditTemplate(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le template</DialogTitle>
          </DialogHeader>
          {editTemplate && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <p className="text-sm mt-1">
                  <Badge variant="outline" className="text-xs mr-2">{editTemplate.type}</Badge>
                  {eventLabels[editTemplate.event] || editTemplate.event}
                </p>
              </div>
              {editTemplate.type === "email" && (
                <div>
                  <label className="text-xs font-medium">Sujet</label>
                  <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="mt-1" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium">Contenu</label>
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={5}
                  className="mt-1 text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Variables: {"{{clientName}}"}, {"{{origin}}"}, {"{{destination}}"}, {"{{time}}"}, {"{{delayMinutes}}"}, {"{{invoiceNumber}}"}, {"{{amount}}"}, {"{{dueDate}}"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>Annuler</Button>
            <Button onClick={saveTemplate}><Save className="h-4 w-4 mr-1" /> Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}