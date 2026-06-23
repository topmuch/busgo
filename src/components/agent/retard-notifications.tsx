"use client";

import { useState, useEffect, useRef } from "react";
import { X, MessageCircle, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface RetardNotification {
  id: string;
  trajetId: string;
  clientId: string;
  clientName: string;
  minutes: number;
  message: string;
  timestamp: string;
}

interface RetardNotificationsProps {
  notifications: RetardNotification[];
  onReply?: (clientId: string, reply: string) => void;
}

const QUICK_REPLIES = [
  { label: "OK", value: "OK, merci de me prévenir." },
  { label: "Dépêche-toi!", value: "Dépêche-toi, le bus va bientôt partir!" },
  { label: "On part sans toi", value: "On part sans toi. Tu devras prendre le prochain." },
];

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 60) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `il y a ${diffHours}h`;
  return `il y a ${Math.floor(diffHours / 24)}j`;
}

interface NotificationItemProps {
  notification: RetardNotification;
  onReply?: (clientId: string, reply: string) => void;
}

function NotificationItem({ notification, onReply }: NotificationItemProps) {
  const [replied, setReplied] = useState(false);

  const handleReply = (reply: string) => {
    if (onReply) {
      onReply(notification.clientId, reply);
    }
    setReplied(true);
  };

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{notification.clientName}</span>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(notification.timestamp)}
        </span>
      </div>

      {/* Arrival info */}
      <div className="flex items-center gap-1.5 text-sm text-amber-600">
        <Clock className="size-3.5" />
        <span>Arrive dans {notification.minutes} min</span>
      </div>

      {/* Message */}
      {notification.message && (
        <p className="text-sm text-muted-foreground">{notification.message}</p>
      )}

      {/* Quick replies */}
      {onReply && !replied && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {QUICK_REPLIES.map((qr) => (
            <button
              key={qr.label}
              type="button"
              onClick={() => handleReply(qr.value)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
            >
              <Send className="size-2.5" />
              {qr.label}
            </button>
          ))}
        </div>
      )}

      {replied && (
        <p className="text-xs text-[#22c55e] font-medium">✓ Réponse envoyée</p>
      )}
    </div>
  );
}

export function RetardNotifications({
  notifications,
  onReply,
}: RetardNotificationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.length;
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new notifications
  useEffect(() => {
    if (isOpen && scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [notifications, isOpen]);

  return (
    <>
      {/* FAB / Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-20 right-4 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition-all duration-200 active:scale-95",
          isOpen
            ? "bg-foreground text-background"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        aria-label={isOpen ? "Fermer les notifications" : "Ouvrir les notifications de retard"}
      >
        {isOpen ? (
          <>
            <X className="size-4" />
            Fermer
          </>
        ) : (
          <>
            <MessageCircle className="size-4" />
            Retards
            {unreadCount > 0 && (
              <Badge className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] rounded-full bg-[#ef4444] text-white border-0">
                {unreadCount}
              </Badge>
            )}
          </>
        )}
      </button>

      {/* Slide-in panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col bg-background border-l shadow-2xl animate-slide-in-right"
          )}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-5 text-primary" />
              <h2 className="text-base font-semibold">Notifications de retard</h2>
            </div>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* Notifications list */}
          <ScrollArea className="flex-1 p-3">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <MessageCircle className="size-10 mb-3 opacity-30" />
                <p className="text-sm">Aucune notification de retard</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notification={notif}
                    onReply={onReply}
                  />
                ))}
                <div ref={scrollEndRef} />
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </>
  );
}