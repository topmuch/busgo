import { NextRequest, NextResponse } from "next/server";

/**
 * Helper to build the public-facing URL from the request, taking into account
 * reverse proxy headers (X-Forwarded-Host, X-Forwarded-Proto).
 *
 * Without this, `new URL("/login", request.url)` returns the container's
 * internal URL (e.g. `http://0.0.0.0:3000/login`) which the browser cannot
 * reach — causing ERR_ADDRESS_INVALID errors.
 */
function buildPublicUrl(request: NextRequest, path: string): URL {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const proto = forwardedProto || request.nextUrl.protocol.replace(":", "") || "http";
  return new URL(path, `${proto}://${host}`);
}

/**
 * POST /api/logout
 *
 * Clears the `next-auth.session-token` cookie and returns a redirect URL
 * for the client to navigate to /login.
 */
export async function POST(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps =
    (forwardedProto && forwardedProto.includes("https")) ||
    request.nextUrl.protocol === "https:";

  const response = NextResponse.json({
    ok: true,
    redirect: "/login",
  });

  // Clear ALL possible session cookie names
  response.cookies.set("busgo-session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: isHttps,
  });
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
 * Clears the cookie and redirects to /login using the PUBLIC-facing URL
 * (from X-Forwarded-Host header) — NOT the container's internal URL.
 */
export async function GET(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps =
    (forwardedProto && forwardedProto.includes("https")) ||
    request.nextUrl.protocol === "https:";

  // Build the redirect URL using the PUBLIC host — this is critical for
  // production where the app runs behind a reverse proxy. Using request.url
  // would redirect to http://0.0.0.0:3000/login which browsers can't reach.
  const loginUrl = buildPublicUrl(request, "/login");
  loginUrl.searchParams.set("loggedOut", "1");

  const response = NextResponse.redirect(loginUrl);

  // Clear ALL possible session cookie names
  response.cookies.set("busgo-session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: isHttps,
  });
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
