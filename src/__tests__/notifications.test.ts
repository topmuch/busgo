import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * ═══════════════════════════════════════════════════════════════
 *  Tests unitaires — Module Notifications (Push + SMS fallback)
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Mocks ─────────────────────────────────────────────────────

const { mockPushSubscriptionFindMany, mockPushSubscriptionDeleteMany, mockUserFindUnique, mockSystemLogCreate, mockSystemConfigFindUnique, mockTenantFindUnique } = vi.hoisted(() => ({
  mockPushSubscriptionFindMany: vi.fn(),
  mockPushSubscriptionDeleteMany: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockSystemLogCreate: vi.fn(),
  mockSystemConfigFindUnique: vi.fn(),
  mockTenantFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    pushSubscription: {
      findMany: mockPushSubscriptionFindMany,
      deleteMany: mockPushSubscriptionDeleteMany,
    },
    user: { findUnique: mockUserFindUnique },
    systemLog: { create: mockSystemLogCreate },
    systemConfig: { findUnique: mockSystemConfigFindUnique },
    tenant: { findUnique: mockTenantFindUnique },
  },
}));

// Mock web-push
const { mockWebpushSendNotification } = vi.hoisted(() => ({
  mockWebpushSendNotification: vi.fn(),
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: mockWebpushSendNotification,
    generateVAPIDKeys: vi.fn(() => ({
      publicKey: "test-public-key",
      privateKey: "test-private-key",
    })),
  },
}));

// Import after mocks
import { sendPush } from "../../src/lib/push";
import { sendSms, getSmsProvider, isSmsConfigured } from "../../src/lib/sms";

// ──────────────────────────────────────────────────────────────
// 1. SMS Service
// ──────────────────────────────────────────────────────────────

describe("SMS Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'console' provider when no env vars set", () => {
    delete process.env.SMS_PROVIDER;
    delete process.env.AT_API_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    expect(getSmsProvider()).toBe("console");
    expect(isSmsConfigured()).toBe(false);
  });

  it("auto-detects Africa's Talking when AT_API_KEY set", () => {
    delete process.env.SMS_PROVIDER;
    process.env.AT_API_KEY = "test-key";
    process.env.AT_USERNAME = "test-user";
    expect(getSmsProvider()).toBe("africastalking");
    expect(isSmsConfigured()).toBe(true);
    delete process.env.AT_API_KEY;
    delete process.env.AT_USERNAME;
  });

  it("auto-detects Twilio when TWILIO_ACCOUNT_SID set", () => {
    delete process.env.SMS_PROVIDER;
    delete process.env.AT_API_KEY;
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "tok";
    expect(getSmsProvider()).toBe("twilio");
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  it("respects explicit SMS_PROVIDER override", () => {
    process.env.AT_API_KEY = "test";
    process.env.AT_USERNAME = "test";
    process.env.SMS_PROVIDER = "console";
    expect(getSmsProvider()).toBe("console");
    delete process.env.SMS_PROVIDER;
    delete process.env.AT_API_KEY;
    delete process.env.AT_USERNAME;
  });

  it("rejects invalid phone numbers", async () => {
    const result = await sendSms("invalid-phone", "test message");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_phone");
  });

  it("accepts valid international phone format", async () => {
    const result = await sendSms("+221770000000", "test");
    // With console provider, should succeed
    expect(result.ok).toBe(true);
    expect(result.provider).toBe("console");
  });

  it("strips spaces and dashes from phone numbers", async () => {
    const result = await sendSms("+221 77 000 00 00", "test");
    expect(result.ok).toBe(true);
  });

  it("truncates message to 160 chars (SMS GSM-7 limit)", async () => {
    const longMessage = "A".repeat(200);
    const result = await sendSms("+221770000000", longMessage);
    expect(result.ok).toBe(true);
    // Console provider logs but doesn't expose truncation — verify it didn't throw
  });
});

// ──────────────────────────────────────────────────────────────
// 2. Push Service
// ──────────────────────────────────────────────────────────────

describe("Push Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set VAPID keys for tests
    process.env.VAPID_PUBLIC_KEY = "test-public-key";
    process.env.VAPID_PRIVATE_KEY = "test-private-key";
    process.env.VAPID_SUBJECT = "mailto:test@busgo.sn";
  });

  afterEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  it("returns notConfigured when VAPID keys are missing", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    const result = await sendPush("user-1", {
      title: "Test",
      body: "Body",
      type: "system",
    });
    expect(result.notConfigured).toBe(true);
    expect(result.sent).toBe(0);
  });

  it("returns sent=0 when user has no subscriptions", async () => {
    mockPushSubscriptionFindMany.mockResolvedValue([]);
    const result = await sendPush("user-no-subs", {
      title: "Test",
      body: "Body",
      type: "system",
    });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("sends to all subscriptions in parallel", async () => {
    mockPushSubscriptionFindMany.mockResolvedValue([
      { id: "s1", endpoint: "https://fcm.googleapis.com/ep1", p256dh: "k1", auth: "a1" },
      { id: "s2", endpoint: "https://fcm.googleapis.com/ep2", p256dh: "k2", auth: "a2" },
    ]);
    mockWebpushSendNotification.mockResolvedValue({ statusCode: 201 });
    mockPushSubscriptionDeleteMany.mockResolvedValue({ count: 0 });

    const result = await sendPush("user-1", {
      title: "Test",
      body: "Body",
      type: "boarding",
    });

    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(mockWebpushSendNotification).toHaveBeenCalledTimes(2);
  });

  it("deletes expired subscriptions (410 Gone)", async () => {
    mockPushSubscriptionFindMany.mockResolvedValue([
      { id: "s1", endpoint: "https://fcm.googleapis.com/ep1", p256dh: "k1", auth: "a1" },
      { id: "s2", endpoint: "https://fcm.googleapis.com/ep2", p256dh: "k2", auth: "a2" },
    ]);
    mockWebpushSendNotification
      .mockResolvedValueOnce({ statusCode: 201 })
      .mockRejectedValueOnce({ statusCode: 410 });
    mockPushSubscriptionDeleteMany.mockResolvedValue({ count: 1 });

    const result = await sendPush("user-1", {
      title: "Test",
      body: "Body",
      type: "boarding",
    });

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.expiredEndpointsDeleted).toBe(1);
    expect(mockPushSubscriptionDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["s2"] } },
    });
  });

  it("deletes 404 Not Found subscriptions", async () => {
    mockPushSubscriptionFindMany.mockResolvedValue([
      { id: "s1", endpoint: "https://fcm.googleapis.com/ep1", p256dh: "k1", auth: "a1" },
    ]);
    mockWebpushSendNotification.mockRejectedValue({ statusCode: 404 });
    mockPushSubscriptionDeleteMany.mockResolvedValue({ count: 1 });

    const result = await sendPush("user-1", {
      title: "Test",
      body: "Body",
      type: "boarding",
    });

    expect(result.expiredEndpointsDeleted).toBe(1);
  });

  it("does NOT delete subscriptions on 5xx errors (server temp failure)", async () => {
    mockPushSubscriptionFindMany.mockResolvedValue([
      { id: "s1", endpoint: "https://fcm.googleapis.com/ep1", p256dh: "k1", auth: "a1" },
    ]);
    mockWebpushSendNotification.mockRejectedValue({ statusCode: 503 });

    const result = await sendPush("user-1", {
      title: "Test",
      body: "Body",
      type: "boarding",
    });

    expect(result.failed).toBe(1);
    expect(result.expiredEndpointsDeleted).toBe(0);
    expect(mockPushSubscriptionDeleteMany).not.toHaveBeenCalled();
  });

  it("handles mixed success/failure across subscriptions", async () => {
    mockPushSubscriptionFindMany.mockResolvedValue([
      { id: "s1", endpoint: "https://fcm.googleapis.com/ep1", p256dh: "k1", auth: "a1" },
      { id: "s2", endpoint: "https://fcm.googleapis.com/ep2", p256dh: "k2", auth: "a2" },
      { id: "s3", endpoint: "https://fcm.googleapis.com/ep3", p256dh: "k3", auth: "a3" },
    ]);
    mockWebpushSendNotification
      .mockResolvedValueOnce({ statusCode: 201 })  // s1 success
      .mockRejectedValueOnce({ statusCode: 410 })  // s2 expired
      .mockRejectedValueOnce({ statusCode: 503 }); // s3 temp fail

    const result = await sendPush("user-1", {
      title: "Test",
      body: "Body",
      type: "boarding",
    });

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(2);
    expect(result.expiredEndpointsDeleted).toBe(1);
  });
});
