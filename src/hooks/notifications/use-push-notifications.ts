"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 *  usePushNotifications — auto-subscribe the user to web-push
 * ═══════════════════════════════════════════════════════════════
 *
 *  Lifecycle:
 *  1. Wait for Service Worker ready
 *  2. Fetch VAPID public key from /api/push/vapid-public-key
 *  3. If permission not granted → request it
 *  4. Subscribe via pushManager.subscribe({ applicationServerKey })
 *  5. POST subscription to /api/push/subscribe
 *
 *  Auto-cleanup: if user revokes permission, the subscription is
 *  removed server-side via /api/push/unsubscribe.
 *
 *  All errors are swallowed silently — push is a progressive
 *  enhancement, never a blocker.
 */

import { useEffect, useState, useCallback } from "react";

type PushStatus =
  | "idle"
  | "checking-support"
  | "requesting-permission"
  | "subscribing"
  | "subscribed"
  | "denied"
  | "unsupported"
  | "not-configured"
  | "error";

interface UsePushOptions {
  /** Auto-subscribe on mount if permission is "default" (default: true) */
  autoSubscribe?: boolean;
  /** Called when subscription succeeds */
  onSubscribed?: () => void;
}

export function usePushNotifications(opts: UsePushOptions = {}) {
  const { autoSubscribe = true, onSubscribed } = opts;
  const [status, setStatus] = useState<PushStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // ─── Check support + initial status ──────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    if (!("Notification" in window)) {
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    if (Notification.permission === "granted") {
      // Will auto-subscribe below if autoSubscribe is on
      setStatus("idle");
    } else {
      setStatus("idle");
    }
  }, []);

  // ─── Subscribe function ──────────────────────────────────────
  const subscribe = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    try {
      // 1. Fetch VAPID public key
      setStatus("checking-support");
      const vapidRes = await fetch("/api/push/vapid-public-key?XTransformPort=3000");
      if (!vapidRes.ok) {
        setStatus("not-configured");
        return;
      }
      const vapidData = await vapidRes.json();
      if (!vapidData.publicKey) {
        setStatus("not-configured");
        return;
      }

      // 2. Request permission if not granted
      if (Notification.permission === "default") {
        setStatus("requesting-permission");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus("denied");
          return;
        }
      } else if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }

      // 3. Wait for SW registration
      setStatus("subscribing");
      const reg = await navigator.serviceWorker.ready;

      // 4. Check if already subscribed
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        // 5. Subscribe with VAPID key
        const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true, // required by spec
          applicationServerKey: applicationServerKey as unknown as BufferSource,
        });
      }

      // 6. POST subscription to server
      const subJson = subscription.toJSON();
      const res = await fetch("/api/push/subscribe?XTransformPort=3000", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      if (!res.ok) {
        throw new Error(`Subscribe API failed: ${res.status}`);
      }

      setStatus("subscribed");
      onSubscribed?.();
    } catch (err) {
      console.error("[PUSH_SUBSCRIBE]", err);
      setError((err as Error).message);
      setStatus("error");
    }
  }, [onSubscribed]);

  // ─── Unsubscribe function ────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe?XTransformPort=3000", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("idle");
    } catch (err) {
      console.error("[PUSH_UNSUBSCRIBE]", err);
    }
  }, []);

  // ─── Auto-subscribe if permission already granted ────────────
  useEffect(() => {
    if (
      autoSubscribe &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted" &&
      status === "idle"
    ) {
      void subscribe();
    }
  }, [autoSubscribe, status, subscribe]);

  return {
    status,
    error,
    subscribe,
    unsubscribe,
    isSupported:
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
    isSubscribed: status === "subscribed",
    permission:
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "unsupported",
  };
}

// ─── Helper: VAPID key base64 → Uint8Array ────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}
