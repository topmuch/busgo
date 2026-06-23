import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const diag: Record<string, unknown> = { step: {} };

  // ===== STEP 1: Environment =====
  diag.step.env = "OK";
  diag.env = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "(NOT SET)",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? `${process.env.NEXTAUTH_SECRET.substring(0, 8)}...(${process.env.NEXTAUTH_SECRET.length}chars)` : "(NOT SET)",
    PORT: process.env.PORT,
    HOSTNAME: process.env.HOSTNAME,
  };

  // ===== STEP 2: Proxy Headers =====
  diag.step.proxy = "OK";
  diag.proxy = {
    host: request.headers.get("host"),
    "x-forwarded-host": request.headers.get("x-forwarded-host"),
    "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
    "x-forwarded-for": request.headers.get("x-forwarded-for"),
    "request-url": request.url,
  };

  // ===== STEP 3: Current Cookies =====
  diag.step.cookies = "OK";
  const cookies = request.cookies.getAll();
  diag.cookies = cookies.map(c => ({
    name: c.name,
    length: c.value?.length || 0,
    preview: c.value ? `${c.value.substring(0, 20)}...` : "(empty)",
  }));

  // ===== STEP 4: Database =====
  try {
    const count = await db.user.count();
    diag.step.db = `OK (${count} users)`;
  } catch (e: unknown) {
    diag.step.db = `FAIL: ${(e as Error).message}`;
    return NextResponse.json(diag);
  }

  // ===== STEP 5: Verify superadmin credentials =====
  const testEmail = "superadmin@busgo.com";
  const testPassword = "Demo1234!";
  let user: Record<string, unknown> | null = null;

  try {
    const u = await db.user.findUnique({ where: { email: testEmail } });
    if (!u) {
      diag.step.credentials = `FAIL: user ${testEmail} not found`;
      return NextResponse.json(diag);
    }
    const valid = await bcrypt.compare(testPassword, u.password);
    if (!valid) {
      diag.step.credentials = `FAIL: password invalid for ${testEmail}`;
      return NextResponse.json(diag);
    }
    diag.step.credentials = "OK";
    user = { id: u.id, email: u.email, role: u.role, isActive: u.isActive, tenantId: u.tenantId };
    diag.user = user;
  } catch (e: unknown) {
    diag.step.credentials = `FAIL: ${(e as Error).message}`;
    return NextResponse.json(diag);
  }

  // ===== STEP 6: Sign JWT (same as /api/login) =====
  const SECRET = process.env.NEXTAUTH_SECRET;
  if (!SECRET) {
    diag.step.signJwt = "FAIL: NEXTAUTH_SECRET is not set";
    return NextResponse.json(diag);
  }

  let token: string;
  try {
    const secret = new TextEncoder().encode(SECRET);
    token = await new SignJWT({
      sub: user!.id,
      email: user!.email,
      name: "Super Admin",
      role: user!.role,
      tenantId: (user!.tenantId as string) ?? null,
      tenantSlug: null,
      tenantName: null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    diag.step.signJwt = `OK (token length: ${token.length})`;
    diag.tokenPreview = `${token.substring(0, 30)}...`;
  } catch (e: unknown) {
    diag.step.signJwt = `FAIL: ${(e as Error).message}`;
    return NextResponse.json(diag);
  }

  // ===== STEP 7: Verify JWT (same as middleware) =====
  try {
    const secret = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Extract role the same way middleware does
    const p = payload as Record<string, unknown>;
    const inner = p.token as Record<string, unknown> | undefined;
    const role = inner?.role || p.role;

    diag.step.verifyJwt = `OK (role extracted: ${role})`;
    diag.jwtPayload = { role, sub: p.sub, email: p.email, exp: p.exp };
  } catch (e: unknown) {
    diag.step.verifyJwt = `FAIL: ${(e as Error).message}`;
    return NextResponse.json(diag);
  }

  // ===== STEP 8: Compute redirect URL (same as /api/login) =====
  let baseUrl = "";
  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL !== "http://localhost:3000") {
    baseUrl = process.env.NEXTAUTH_URL.replace(/\/$/, "");
  } else {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    if (host && host !== "0.0.0.0:3000") {
      baseUrl = `${proto}://${host}`;
    } else {
      const url = new URL(request.url);
      const fwdHost = request.headers.get("x-forwarded-host");
      if (fwdHost) {
        url.protocol = proto;
        url.host = fwdHost;
        baseUrl = url.origin;
      } else {
        baseUrl = url.origin;
      }
    }
  }

  const redirectPath = user!.role === "superadmin" ? "/superadmin" : user!.role === "admin" ? "/admin" : "/client";
  const redirectUrl = `${baseUrl}${redirectPath}`;

  diag.step.redirectUrl = baseUrl.includes("0.0.0.0") ? `FAIL: redirect to ${redirectUrl}` : `OK: ${redirectUrl}`;
  diag.redirectUrl = redirectUrl;

  // ===== STEP 9: Test existing cookies against middleware logic =====
  const cookieNames = ["next-auth.session-token", "__Secure-next-auth.session-token"];
  let existingToken: string | null = null;
  let foundCookieName = "";

  for (const name of cookieNames) {
    const val = request.cookies.get(name)?.value;
    if (val) {
      existingToken = val;
      foundCookieName = name;
      break;
    }
  }

  if (existingToken) {
    try {
      const secret = new TextEncoder().encode(SECRET);
      const { payload } = await jwtVerify(existingToken, secret);
      const p = payload as Record<string, unknown>;
      const inner = p.token as Record<string, unknown> | undefined;
      const role = inner?.role || p.role;
      diag.step.existingCookie = `OK: cookie "${foundCookieName}" has valid JWT with role="${role}"`;
    } catch (e: unknown) {
      diag.step.existingCookie = `FAIL: cookie "${foundCookieName}" JWT verification failed: ${(e as Error).message}`;
    }
  } else {
    diag.step.existingCookie = "NO COOKIE FOUND (user not logged in yet - this is normal before first login)";
  }

  // ===== SUMMARY =====
  const allSteps = Object.entries(diag.step) as [string, string][];
  const failed = allSteps.filter(([, v]) => v.startsWith("FAIL"));
  diag.summary = failed.length === 0
    ? "ALL CHECKS PASSED - login should work. If it doesn't, the issue is in the browser (cookie not being set or sent)."
    : `${failed.length} step(s) failed: ${failed.map(([k, v]) => `${k}=${v}`).join("; ")}`;

  return NextResponse.json(diag);
}