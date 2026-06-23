import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/test-login
 * Simule le login complet et retourne un diagnostic détaillé.
 * Visiter cette URL directement dans le navigateur pour voir le résultat.
 */
export async function GET(request: NextRequest) {
  const report: Record<string, unknown> = {};

  // ====== ÉTAPE 1: Environnement ======
  report.env = {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "(not set)",
    NEXTAUTH_SECRET_FIRST_10: (process.env.NEXTAUTH_SECRET || "(not set)").substring(0, 10) + "...",
    DATABASE_URL: process.env.DATABASE_URL,
  };

  // ====== ÉTAPE 2: Proxy headers ======
  report.proxyHeaders = {
    host: request.headers.get("host"),
    "x-forwarded-host": request.headers.get("x-forwarded-host"),
    "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
    requestUrl: request.url,
  };

  // ====== ÉTAPE 3: Trouver l'utilisateur ======
  report.step3_findUser = {};
  try {
    const user = await db.user.findUnique({
      where: { email: "superadmin@busgo.com" },
    });
    if (!user) {
      report.step3_findUser = { status: "FAIL", error: "User not found" };
      return NextResponse.json(report);
    }
    report.step3_findUser = { status: "OK", id: user.id, role: user.role, isActive: user.isActive };
  } catch (e: unknown) {
    report.step3_findUser = { status: "ERROR", message: (e as Error).message };
    return NextResponse.json(report);
  }

  // ====== ÉTAPE 4: Vérifier le mot de passe ======
  report.step4_password = {};
  try {
    const user = await db.user.findUnique({ where: { email: "superadmin@busgo.com" } });
    const valid = await bcrypt.compare("Demo1234!", user!.password);
    report.step4_password = { status: valid ? "OK" : "FAIL", passwordValid: valid };
    if (!valid) return NextResponse.json(report);
  } catch (e: unknown) {
    report.step4_password = { status: "ERROR", message: (e as Error).message };
    return NextResponse.json(report);
  }

  // ====== ÉTAPE 5: Signer le JWT (exactement comme /api/login) ======
  report.step5_signJwt = {};
  let token = "";
  try {
    const SECRET = process.env.NEXTAUTH_SECRET || "busgo-superadmin-secret-change-me-2024";
    const secret = new TextEncoder().encode(SECRET);
    token = await new SignJWT({
      sub: "test-id",
      email: "superadmin@busgo.com",
      name: "Super Admin",
      role: "superadmin",
      tenantId: null,
      tenantSlug: null,
      tenantName: null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);
    report.step5_signJwt = { status: "OK", tokenLength: token.length, tokenPreview: token.substring(0, 50) + "..." };
  } catch (e: unknown) {
    report.step5_signJwt = { status: "ERROR", message: (e as Error).message };
    return NextResponse.json(report);
  }

  // ====== ÉTAPE 6: Vérifier le JWT (exactement comme le middleware) ======
  report.step6_verifyJwt = {};
  try {
    const SECRET = process.env.NEXTAUTH_SECRET || "busgo-superadmin-secret-change-me-2024";
    const secret = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secret);
    const p = payload as Record<string, unknown>;
    const inner = p.token as Record<string, unknown> | undefined;
    const role = (inner?.role || p.role) as string | undefined;
    report.step6_verifyJwt = {
      status: "OK",
      roleFound: role,
      roleMatchesSuperadmin: role === "superadmin",
      payloadKeys: Object.keys(p),
    };
  } catch (e: unknown) {
    report.step6_verifyJwt = { status: "FAIL", error: (e as Error).message };
  }

  // ====== ÉTAPE 7: Calculer l'URL de redirect ======
  report.step7_redirectUrl = {};
  const NEXTAUTH_URL = process.env.NEXTAUTH_URL;
  const fwdHost = request.headers.get("x-forwarded-host");
  const fwdProto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host");

  let redirectUrl = "";
  if (NEXTAUTH_URL && NEXTAUTH_URL !== "http://localhost:3000") {
    redirectUrl = `${NEXTAUTH_URL.replace(/\/$/, "")}/superadmin`;
  } else if (fwdHost && fwdHost !== "0.0.0.0:3000") {
    redirectUrl = `${fwdProto}://${fwdHost}/superadmin`;
  } else {
    redirectUrl = "MISSING - cannot determine public URL";
  }
  report.step7_redirectUrl = { calculatedUrl: redirectUrl, looksValid: redirectUrl.includes("paradisinvesttourime") };

  // ====== ÉTAPE 8: Vérifier les cookies existants ======
  report.step8_cookies = request.cookies.getAll().map(c => ({
    name: c.name,
    length: c.value?.length || 0,
    preview: c.value ? c.value.substring(0, 30) + "..." : "(empty)",
  }));

  // ====== ÉTAPE 9: Poser le cookie ET retourner le JSON ======
  report.step9_cookieSet = {};
  try {
    const response = NextResponse.json(report);
    response.cookies.set("next-auth.session-token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      secure: false,
    });
    report.step9_cookieSet = {
      status: "DONE",
      cookieName: "next-auth.session-token",
      message: "Cookie posé sur cette réponse. Recharger /api/test-login pour voir si le cookie persiste.",
    };

    // Mettre à jour le rapport avec le step 9
    (report.step9_cookieSet as Record<string, unknown>).nextStep =
      "Maintenant visitez /superadmin - si le middleware accepte le cookie, vous verrez le dashboard.";

    return response;
  } catch (e: unknown) {
    report.step9_cookieSet = { status: "ERROR", message: (e as Error).message };
    return NextResponse.json(report);
  }
}