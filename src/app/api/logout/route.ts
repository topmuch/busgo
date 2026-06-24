import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/logout
 *
 * Clears the `next-auth.session-token` cookie and returns a redirect URL
 * for the client to navigate to /login.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The previous logout button pointed to `/api/auth/signout` (NextAuth's
 * built-in signout route). But our auth flow uses a custom JWT issued by
 * `/api/login` (not NextAuth's `signIn`), so NextAuth's signout doesn't
 * actually clear the cookie. This route does the actual cleanup.
 *
 * USAGE
 * ─────
 * Front-end: send a POST request (or navigate to it, see below) and the
 * response will:
 *   1. Set-Cookie with Max-Age=0 to delete the session cookie
 *   2. Return JSON { ok: true, redirect: "/login" }
 *
 * The client should then call `window.location.href = data.redirect`.
 */
export async function POST(request: NextRequest) {
  // Detect HTTPS from X-Forwarded-Proto (same logic as /api/login)
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps =
    (forwardedProto && forwardedProto.includes("https")) ||
    request.nextUrl.protocol === "https:";

  const response = NextResponse.json({
    ok: true,
    redirect: "/login",
  });

  // Clear the session cookie. We set Max-Age=0 on BOTH possible cookie names
  // to be safe (the __Secure- variant in case any old cookies exist).
  response.cookies.set("next-auth.session-token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: isHttps,
  });
  response.cookies.set("__Secure-next-auth.session-token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: true,
  });

  return response;
}

/**
 * GET /api/logout
 *
 * Allows the logout to be triggered by a simple link click (no JS needed).
 * Clears the cookie and redirects to /login.
 *
 * This is what `<Link href="/api/logout">Déconnexion</Link>` will hit.
 */
export async function GET(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps =
    (forwardedProto && forwardedProto.includes("https")) ||
    request.nextUrl.protocol === "https:";

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("loggedOut", "1");

  const response = NextResponse.redirect(loginUrl);

  // Clear both possible cookie names
  response.cookies.set("next-auth.session-token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: isHttps,
  });
  response.cookies.set("__Secure-next-auth.session-token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: true,
  });

  return response;
}
