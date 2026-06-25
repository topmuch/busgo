import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import type { Session } from "next-auth";

/**
 * Récupère la session utilisateur côté serveur (Server Components, API routes,
 * Server Actions) en décodant le cookie `next-auth.session-token`.
 *
 * PRÉCÉDENT ÉTAT (CRITIQUE — bypass désactivé)
 * ─────────────────────────────────────────────
 * Cette fonction retournait TOUJOURS un utilisateur superadmin fictif
 * (id: "bypass-001", email: "superadmin@busgo.com") sans vérifier de cookie.
 * Conséquence : n'importe quel visiteur anonyme était traité comme superadmin.
 *
 * NOUVEL ÉTAT (restauré)
 * ──────────────────────
 * Lit le cookie `next-auth.session-token`, le décode et vérifie la signature
 * JWT avec `NEXTAUTH_SECRET`. Retourne la session si valide, `null` sinon.
 *
 * Le token est créé par `/api/login` (qui utilise `jose.SignJWT`). Le format
 * du payload est :
 *   { sub, email, name, role, tenantId?, tenantSlug?, tenantName?, iat, exp }
 *
 * USAGE
 * ─────
 *   import { getServerSession } from "@/lib/get-session";
 *   const session = await getServerSession();
 *   if (!session) redirect("/login");
 *   if (session.user.role !== "superadmin") redirect("/unauthorized");
 */

const COOKIE_NAMES = [
  "busgo-session",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function getSecret(): Uint8Array {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    "busgo-superadmin-secret-change-me-2024"; // fallback identique à /api/login
  return new TextEncoder().encode(secret);
}

export interface AppSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId?: string;
    tenantSlug?: string;
    tenantName?: string;
  };
  expires: string;
}

/**
 * Vérifie et décode un JWT Brut (string). Retourne le payload ou null.
 * Utilisée par le middleware (côté edge, sans accès à next/headers).
 */
export async function verifyToken(
  token: string
): Promise<AppSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    // Le payload contient sub, email, name, role, tenantId?, tenantSlug?, tenantName?
    // On le normalise au format AppSession attendu par les layouts.
    return {
      user: {
        id: (payload.sub as string) || "",
        email: (payload.email as string) || "",
        name: (payload.name as string) || "",
        role: (payload.role as string) || "client",
        tenantId: (payload.tenantId as string) || undefined,
        tenantSlug: (payload.tenantSlug as string) || undefined,
        tenantName: (payload.tenantName as string) || undefined,
      },
      expires: payload.exp
        ? new Date(payload.exp * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch {
    // Token expiré, signature invalide, ou malformé → pas de session
    return null;
  }
}

/**
 * Récupère la session côté Server Component / Route Handler / Server Action.
 * Lit le cookie via `next/headers` puis décode le JWT.
 */
export async function getServerSession(): Promise<AppSession | null> {
  try {
    const cookieStore = await cookies();
    // Iterate over ALL cookie names and return the FIRST VALID session.
    // This handles the case where the browser has multiple session cookies
    // (e.g. an old `__Secure-next-auth.session-token` from a previous NextAuth
    // deployment + a fresh `next-auth.session-token` from /api/login). Without
    // this, a stale invalid cookie would shadow the valid one and cause
    // spurious redirects to /login.
    for (const name of COOKIE_NAMES) {
      const token = cookieStore.get(name)?.value;
      if (!token) continue;
      const session = await verifyToken(token);
      if (session) return session;
    }
    return null;
  } catch {
    // `cookies()` ne peut pas être appelé dans certains contextes (ex: middleware)
    // — utiliser `verifyToken()` directement dans ce cas.
    return null;
  }
}
