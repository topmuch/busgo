/**
 * Generate VAPID keys for web-push.
 * Run: bun scripts/generate-vapid-keys.ts
 *
 * Then add the output to your .env file.
 */

import webpush from "web-push";

async function main() {
  const keys = webpush.generateVAPIDKeys();

  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  VAPID Keys Generated — add to .env                       ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("# .env");
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:support@busgo.sn`);
  console.log("");
  console.log("# Optional: SMS provider (for fallback when push fails)");
  console.log("# Africa's Talking (recommended for Senegal)");
  console.log("# SMS_PROVIDER=africastalking");
  console.log("# AT_API_KEY=your_api_key");
  console.log("# AT_USERNAME=your_username");
  console.log("# AT_SENDER_ID=BUSGO");
  console.log("");
  console.log("# Or Twilio (international)");
  console.log("# SMS_PROVIDER=twilio");
  console.log("# TWILIO_ACCOUNT_SID=AC...");
  console.log("# TWILIO_AUTH_TOKEN=...");
  console.log("# TWILIO_FROM=+1234567890");
  console.log("");
  console.log("✅ After saving .env, restart the dev server.");
  console.log("   Push notifications will be auto-enabled on /client page.");
}

main().catch(console.error);
