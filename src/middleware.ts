import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Middleware d'authentification — protège les routes authentifiées.
 *
 * PRÉCÉDENT ÉTAT (CRITIQUE — bypass désactivé)
 * ─────────────────────────────────────────────
 * Le middleware était un no-op (`return NextResponse.next()`) à cause d'un
 * workaround pour un problème de cookies Coolify. Conséquence : n'importe quel
 * visiteur anonyme était traité comme superadmin.
 *
 * NOUVEL ÉTAT (restauré)
 * ──────────────────────
 * Lit le cookie `next-auth.session-token` (ou `__Secure-next-auth.session-token`
 * en production HTTPS), décode et vérifie le JWT avec `NEXTAUTH_SECRET` (via
 * `jose.jwtVerify`). Si invalide ou absent, redirige vers `/login?callbackUrl=...`.
 *
 * ROUTES PROTÉGÉES
 * ────────────────
 * - /superadmin/*  → superadmin uniquement (vérifié dans layout.tsx)
 * - /admin/*       → admin + superadmin (vérifié dans layout.tsx)
 * - /agent/*       → agent + admin + superadmin (vérifié dans layout.tsx)
 * - /client/*      → toute session valide
 *
 * /login n'est PAS protégé — la page doit rester accessible sans session.
 */
const COOKIE_NAMES =
  process.env.NODE_ENV === "production"
    ? ["__Secure-next-auth.session-token", "next-auth.session-token"]
    : ["next-auth.session-token"];

function getSecret(): Uint8Array {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    "busgo-superadmin-secret-change-me-2024";
  return new TextEncoder().encode(secret);
}

async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  // Try both cookie names (production uses __Secure- prefix, dev uses bare name)
  let token: string | undefined;
  for (const name of COOKIE_NAMES) {
    token = request.cookies.get(name)?.value;
    if (token) break;
  }

  const isValid = await verifySessionToken(token);

  if (!isValid) {
    // Rediriger vers /login en préservant l'URL d'origine pour post-login redirect
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/superadmin/:path*",
    "/admin/:path*",
    "/agent/:path*",
    "/client/:path*",
  ],
};
