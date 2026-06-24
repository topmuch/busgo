import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Middleware d'authentification — protège les routes authentifiées.
 *
 * Lit le cookie `next-auth.session-token`, décode et vérifie le JWT avec
 * `NEXTAUTH_SECRET` (via `jose.jwtVerify`). Si invalide ou absent, redirige
 * vers `/login?callbackUrl=...`.
 *
 * IMPORTANT — Gestion des cookies invalides
 * ─────────────────────────────────────────
 * Quand un utilisateur a un vieux cookie invalide (par exemple après un
 * changement de NEXTAUTH_SECRET ou après un changement de format de token),
 * le middleware supprime ce cookie avant de rediriger vers /login. Cela
 * évite la boucle "je clique sur un lien → redirect /login → je me login →
 * je clique sur un lien → redirect /login" qui se produit quand le navigateur
 * garde un cookie invalide.
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
const COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

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
  // Iterate over ALL cookie names. If ANY of them contains a valid JWT,
  // we authorize the request. This handles the case where the browser has
  // both a stale invalid `__Secure-next-auth.session-token` (from a previous
  // NextAuth deployment) AND a fresh valid `next-auth.session-token` (from
  // /api/login). Without this, the stale cookie would shadow the valid one.
  let validToken = false;
  const invalidCookieNames: string[] = [];

  for (const name of COOKIE_NAMES) {
    const token = request.cookies.get(name)?.value;
    if (!token) continue;
    if (await verifySessionToken(token)) {
      validToken = true;
      break; // Found a valid session, no need to check further
    }
    invalidCookieNames.push(name);
  }

  if (!validToken) {
    // Build the redirect response to /login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);

    const response = NextResponse.redirect(loginUrl);

    // Delete ALL invalid session cookies so the next login attempt starts
    // from a clean state. Without this, the browser keeps sending the
    // invalid cookies on every subsequent navigation, causing an infinite
    // /login redirect loop even after a successful login.
    for (const name of invalidCookieNames) {
      response.cookies.set(name, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0, // expire immediately
      });
    }

    return response;
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
