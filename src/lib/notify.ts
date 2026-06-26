/**
 * ═══════════════════════════════════════════════════════════════
 *  Unified Notification Service
 *  Push → SMS fallback strategy
 * ═══════════════════════════════════════════════════════════════
 *
 *  Flow:
 *  1. Try sendPush(userId, payload)
 *  2. If sent === 0 AND tenant has SMS enabled AND user has phone → sendSms
 *  3. Log result to SystemLog
 *
 *  This is the ONLY entry point for user notifications — never call
 *  sendPush or sendSms directly from API routes.
 */

import { sendPush, type PushPayload } from "@/lib/push";
import { sendSmsWithLog } from "@/lib/sms";
import { db } from "@/lib/db";

export interface NotificationResult {
  pushSent: boolean;
  smsSent: boolean;
  notConfigured: boolean;
  error?: string;
}

export async function notifyUser(params: {
  userId: string;
  tenantId?: string;
  pushPayload: PushPayload;
  smsText: string;
  /**
   * Override the SMS fallback decision.
   * If undefined, the service checks tenant.smsEnabled (defaults to false).
   * Set to true to force SMS fallback (e.g. for critical alerts).
   */
  forceSmsFallback?: boolean;
}): Promise<NotificationResult> {
  const { userId, pushPayload, smsText } = params;

  // 1. Try Push first
  const pushResult = await sendPush(userId, pushPayload);

  if (pushResult.sent > 0) {
    return { pushSent: true, smsSent: false, notConfigured: pushResult.notConfigured };
  }

  // 2. Push failed or no subscriptions — check SMS fallback
  let smsFallbackEnabled = params.forceSmsFallback === true;

  // Check tenant.smsEnabled if not forced
  if (!smsFallbackEnabled && params.tenantId) {
    try {
      const tenant = await db.tenant.findUnique({
        where: { id: params.tenantId },
        select: { name: true },
      });
      // For now, we don't have a per-tenant smsEnabled field on Tenant model
      // (it's on SystemConfig). Use SystemConfig global flag.
      const config = await db.systemConfig.findUnique({
        where: { id: "global" },
        select: { smsEnabled: true, supportPhone: true },
      });
      smsFallbackEnabled = config?.smsEnabled === true;
    } catch {
      // Silent fail — don't block notifications
    }
  }

  if (!smsFallbackEnabled) {
    return {
      pushSent: false,
      smsSent: false,
      notConfigured: pushResult.notConfigured,
      error: "no_fallback_enabled",
    };
  }

  // 3. Get user phone and send SMS
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });

  if (!user?.phone) {
    return {
      pushSent: false,
      smsSent: false,
      notConfigured: pushResult.notConfigured,
      error: "no_user_phone",
    };
  }

  const smsResult = await sendSmsWithLog(userId, user.phone, smsText);

  return {
    pushSent: false,
    smsSent: smsResult.ok,
    notConfigured: pushResult.notConfigured,
    error: smsResult.ok ? undefined : smsResult.error,
  };
}
