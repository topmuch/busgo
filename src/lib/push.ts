/**
 * ═══════════════════════════════════════════════════════════════
 *  Push Notification Service (web-push VAPID)
 * ═══════════════════════════════════════════════════════════════
 *
 *  Architecture:
 *  - VAPID keys in env (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
 *  - PushSubscription table persists per-device subscriptions
 *  - sendPush() iterates user subscriptions, sends, cleans up expired
 *
 *  VAPID keys generation (one-time setup):
 *    bunx web-push generate-vapid-keys
 *  Then add to .env:
 *    VAPID_PUBLIC_KEY=...
 *    VAPID_PRIVATE_KEY=...
 *    VAPID_SUBJECT=mailto:support@busgo.sn
 */

import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { db } from "@/lib/db";

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@busgo.sn";

  if (!publicKey || !privateKey) {
    // Push disabled — silent fallback
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export function isPushConfigured(): boolean {
  configureVapid();
  return vapidConfigured;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export interface PushPayload {
  title: string;
  body: string;
  type:
    | "boarding"
    | "departure"
    | "delay"
    | "scan"
    | "system"
    | "passager:manquant"
    | "timer:5min"
    | "timer:2min"
    | "message:retard"
    | "depart:confirme";
  ttsMessage?: string; // spoken via SW if TTS engine is available
  data?: Record<string, unknown>;
  tag?: string; // notification tag for grouping
  requireInteraction?: boolean;
}

export interface SendPushResult {
  sent: number;
  failed: number;
  expiredEndpointsDeleted: number;
  notConfigured: boolean;
}

/**
 * Send a push notification to all devices subscribed by a user.
 * Cleans up expired subscriptions (410 Gone, 404, 410).
 */
export async function sendPush(
  userId: string,
  payload: PushPayload
): Promise<SendPushResult> {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0, expiredEndpointsDeleted: 0, notConfigured: true };
  }

  const subs = await db.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subs.length === 0) {
    return { sent: 0, failed: 0, expiredEndpointsDeleted: 0, notConfigured: false };
  }

  const message = JSON.stringify(payload);
  const expiredIds: string[] = [];
  let sent = 0;
  let failed = 0;

  // Send in parallel with allSettled (don't block on slow endpoints)
  const results = await Promise.allSettled(
    subs.map((sub) => {
      const pushSubscription: WebPushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      return webpush.sendNotification(pushSubscription, message, {
        TTL: 60 * 60 * 24, // 24h
        urgency: payload.requireInteraction ? "high" : "normal",
        topic: payload.tag,
      });
    })
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    if (r.status === "fulfilled") {
      sent++;
    } else {
      failed++;
      const statusCode = (r.reason as { statusCode?: number })?.statusCode;
      // 404 = endpoint gone, 410 = expired, 403/401 = auth error
      if (
        statusCode === 404 ||
        statusCode === 410 ||
        statusCode === 403 ||
        statusCode === 401
      ) {
        expiredIds.push(subs[i]!.id);
      }
    }
  }

  // Cleanup expired subscriptions
  if (expiredIds.length > 0) {
    await db.pushSubscription.deleteMany({
      where: { id: { in: expiredIds } },
    });
  }

  return {
    sent,
    failed,
    expiredEndpointsDeleted: expiredIds.length,
    notConfigured: false,
  };
}

/**
 * Subscribe a device — called from /api/push/subscribe.
 * Idempotent: if endpoint already exists, updates the keys.
 */
export async function subscribeDevice(params: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<{ ok: boolean; subscriptionId: string }> {
  const existing = await db.pushSubscription.findUnique({
    where: { endpoint: params.endpoint },
    select: { id: true },
  });

  if (existing) {
    await db.pushSubscription.update({
      where: { id: existing.id },
      data: {
        p256dh: params.p256dh,
        auth: params.auth,
        userId: params.userId, // rebind to current user (in case of shared device)
        updatedAt: new Date(),
      },
    });
    return { ok: true, subscriptionId: existing.id };
  }

  const created = await db.pushSubscription.create({
    data: {
      userId: params.userId,
      endpoint: params.endpoint,
      p256dh: params.p256dh,
      auth: params.auth,
      updatedAt: new Date(),
    },
  });

  return { ok: true, subscriptionId: created.id };
}

/**
 * Unsubscribe a device — called when user revokes notification permission
 * or logs out.
 */
export async function unsubscribeDevice(endpoint: string): Promise<void> {
  await db.pushSubscription.deleteMany({ where: { endpoint } });
}
