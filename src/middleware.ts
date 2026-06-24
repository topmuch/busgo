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
  // Find the first present session cookie (try bare name first — that's what
  // /api/login sets now).
  let token: string | undefined;
  let tokenCookieName: string | undefined;
  for (const name of COOKIE_NAMES) {
    const v = request.cookies.get(name)?.value;
    if (v) {
      token = v;
      tokenCookieName = name;
      break;
    }
  }

  const isValid = await verifySessionToken(token);

  if (!isValid) {
    // Build the redirect response to /login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);

    const response = NextResponse.redirect(loginUrl);

    // If an invalid cookie was present, DELETE it so the next login attempt
    // starts from a clean state. Without this, the browser keeps sending
    // the invalid cookie on every subsequent navigation, causing an infinite
    // /login redirect loop even after a successful login.
    if (tokenCookieName) {
      response.cookies.set(tokenCookieName, "", {
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
