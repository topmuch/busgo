/**
 * ═══════════════════════════════════════════════════════════════
 *  SMS Service — fallback when Push fails
 * ═══════════════════════════════════════════════════════════════
 *
 *  Multi-provider abstraction:
 *  - Africa's Talking (preferred for Senegal/WAIO — free sandbox)
 *  - Twilio (fallback international)
 *  - Console log (dev — no env vars required)
 *
 *  Configuration (.env):
 *    SMS_PROVIDER=africastalking|twilio|console
 *    AT_API_KEY=...
 *    AT_USERNAME=...
 *    AT_SENDER_ID=BUSGO
 *    TWILIO_ACCOUNT_SID=...
 *    TWILIO_AUTH_TOKEN=...
 *    TWILIO_FROM=+1234567890
 *
 *  If no provider configured, falls back to console.log (dev mode).
 */

import { db } from "@/lib/db";

export type SmsProvider = "africastalking" | "twilio" | "console";

export function getSmsProvider(): SmsProvider {
  const env = process.env.SMS_PROVIDER as SmsProvider | undefined;
  if (env && ["africastalking", "twilio", "console"].includes(env)) {
    return env;
  }
  // Auto-detect: Africa's Talking if AT_API_KEY set, Twilio if TWILIO_ACCOUNT_SID set
  if (process.env.AT_API_KEY && process.env.AT_USERNAME) return "africastalking";
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) return "twilio";
  return "console";
}

export function isSmsConfigured(): boolean {
  return getSmsProvider() !== "console";
}

export interface SmsResult {
  ok: boolean;
  provider: SmsProvider;
  messageId?: string;
  error?: string;
}

/**
 * Send an SMS to a phone number.
 * Validates phone format (+countrycode + digits, max 20 chars).
 * Truncates message to 160 chars (GSM-7 single-segment limit).
 */
export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  // Validate phone
  if (!phone || !/^\+?[1-9]\d{6,19}$/.test(phone.replace(/[\s\-()]/g, ""))) {
    return { ok: false, provider: "console", error: "invalid_phone" };
  }

  const cleanPhone = phone.replace(/[\s\-()]/g, "");
  const cleanMessage = message.slice(0, 160);
  const provider = getSmsProvider();

  try {
    switch (provider) {
      case "africastalking": {
        return await sendViaAfricasTalking(cleanPhone, cleanMessage);
      }
      case "twilio": {
        return await sendViaTwilio(cleanPhone, cleanMessage);
      }
      case "console":
      default: {
        console.log(`[SMS/console] To: ${cleanPhone} | Msg: ${cleanMessage}`);
        return {
          ok: true,
          provider: "console",
          messageId: `console-${Date.now()}`,
        };
      }
    }
  } catch (err) {
    console.error(`[SMS_ERROR] provider=${provider}`, err);
    return {
      ok: false,
      provider,
      error: (err as Error).message,
    };
  }
}

async function sendViaAfricasTalking(
  phone: string,
  message: string
): Promise<SmsResult> {
  // Dynamic import to avoid bundle overhead when not used
  const apiKey = process.env.AT_API_KEY!;
  const username = process.env.AT_USERNAME!;
  const senderId = process.env.AT_SENDER_ID || "BUSGO";

  // Africa's Talking API — direct fetch to avoid SDK dependency
  const url = "https://api.africastalking.com/version1/messaging";
  const body = new URLSearchParams({
    username,
    to: phone,
    message,
    from: senderId,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    return {
      ok: false,
      provider: "africastalking",
      error: `HTTP ${res.status}: ${await res.text()}`,
    };
  }

  const data = (await res.json()) as {
    SMSMessageData?: { MessageSent?: string; Recipients?: Array<{ messageId?: string; status?: string }> };
  };

  const recipient = data.SMSMessageData?.Recipients?.[0];
  if (recipient?.status === "Success") {
    return {
      ok: true,
      provider: "africastalking",
      messageId: recipient.messageId,
    };
  }

  return {
    ok: false,
    provider: "africastalking",
    error: recipient?.status ?? "unknown",
  };
}

async function sendViaTwilio(phone: string, message: string): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM!;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    To: phone,
    From: from,
    Body: message,
  });

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    return {
      ok: false,
      provider: "twilio",
      error: `HTTP ${res.status}: ${await res.text()}`,
    };
  }

  const data = (await res.json()) as { sid?: string; error_code?: number | null };
  if (data.error_code) {
    return {
      ok: false,
      provider: "twilio",
      error: `Twilio error ${data.error_code}`,
    };
  }

  return { ok: true, provider: "twilio", messageId: data.sid };
}

// ─── Audit log model (SystemLog) ─────────────────────────────

async function logSmsAttempt(params: {
  userId: string;
  phone: string;
  message: string;
  result: SmsResult;
}) {
  try {
    await db.systemLog.create({
      data: {
        level: params.result.ok ? "info" : "error",
        action: "sms.send",
        message: `SMS to ${params.phone.substring(0, 8)}***`,
        userId: params.userId,
        metadata: JSON.stringify({
          provider: params.result.provider,
          messageId: params.result.messageId,
          error: params.result.error,
          messageLength: params.message.length,
        }),
      },
    });
  } catch {
    // Logging failure is non-blocking
  }
}

export async function sendSmsWithLog(
  userId: string,
  phone: string,
  message: string
): Promise<SmsResult> {
  const result = await sendSms(phone, message);
  await logSmsAttempt({ userId, phone, message, result });
  return result;
}
