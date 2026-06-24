import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Helper to build the public-facing URL from the request, taking into account
 * reverse proxy headers (X-Forwarded-Host, X-Forwarded-Proto) set by
 * Coolify/Caddy/Traefik/Nginx.
 *
 * Without this, `new URL("/login", request.url)` returns the container's
 * internal URL (e.g. `http://0.0.0.0:3000/login`) which the browser cannot
 * reach — causing ERR_ADDRESS_INVALID errors and breaking redirects.
 */
function buildPublicUrl(request: NextRequest, path: string): URL {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const proto = forwardedProto || request.nextUrl.protocol.replace(":", "") || "http";
  return new URL(path, `${proto}://${host}`);
}

/**
 * Middleware d'authentification — protège les routes authentifiées.
 *
 * Lit le cookie `next-auth.session-token`, décode et vérifie le JWT avec
 * `NEXTAUTH_SECRET` (via `jose.jwtVerify`). Si invalide ou absent, redirige
 * vers `/login?callbackUrl=...`.
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
  // we authorize the request.
  let validToken = false;
  const invalidCookieNames: string[] = [];

  for (const name of COOKIE_NAMES) {
    const token = request.cookies.get(name)?.value;
    if (!token) continue;
    if (await verifySessionToken(token)) {
      validToken = true;
      break;
    }
    invalidCookieNames.push(name);
  }

  if (!validToken) {
    // Build the redirect URL using the PUBLIC-facing host (from X-Forwarded-Host
    // header) — NOT request.url which returns the container's internal URL.
    const loginUrl = buildPublicUrl(request, "/login");
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);

    const response = NextResponse.redirect(loginUrl);

    // Delete ALL invalid session cookies
    for (const name of invalidCookieNames) {
      response.cookies.set(name, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
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
