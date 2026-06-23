import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const publicPaths = ["/login", "/api/auth", "/api/login", "/api/debug", "/api/test-login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p)) || pathname === "/") {
    return NextResponse.next();
  }

  // Allow static files, images, _next, favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/sw") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Public routes (no auth needed)
  if (pathname.startsWith("/public/")) {
    return NextResponse.next();
  }

  // Determine required roles
  let requiredRoles: string[] | null = null;
  if (pathname.startsWith("/superadmin")) {
    requiredRoles = ["superadmin"];
  } else if (pathname.startsWith("/admin")) {
    requiredRoles = ["admin", "superadmin"];
  } else if (pathname.startsWith("/agent")) {
    requiredRoles = ["agent", "admin", "superadmin"];
  } else if (pathname.startsWith("/client")) {
    requiredRoles = ["client", "admin", "superadmin"];
  }

  if (!requiredRoles) {
    return NextResponse.next();
  }

  // Get JWT token - check all possible cookie names
  const cookieNames = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];
  let token: string | undefined;
  for (const name of cookieNames) {
    const val = request.cookies.get(name)?.value;
    if (val) {
      token = val;
      break;
    }
  }

  if (!token) {
    // Redirect to login using forwarded headers (NOT request.url which is 0.0.0.0)
    const loginUrl = buildPublicUrl(request, "/login");
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "busgo-superadmin-secret-change-me-2024"
    );
    const { payload } = await jwtVerify(token, secret);

    // Custom API token: role at top level. NextAuth: role in payload.token.role
    const p = payload as Record<string, unknown>;
    const inner = p.token as Record<string, unknown> | undefined;
    const role = (inner?.role || p.role) as string | undefined;

    if (!role || !requiredRoles.includes(role)) {
      if (role) {
        return NextResponse.redirect(buildPublicUrl(request, "/login"));
      }
      const loginUrl = buildPublicUrl(request, "/login");
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch {
    // JWT verification failed (wrong secret, expired, etc.)
    const loginUrl = buildPublicUrl(request, "/login");
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * Build a public URL using proxy headers instead of request.url
 * request.url contains 0.0.0.0:3000 which is invalid for browser redirects
 */
function buildPublicUrl(request: NextRequest, path: string): URL {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  if (host && host !== "0.0.0.0:3000") {
    return new URL(`${proto}://${host}${path}`);
  }
  // Fallback: try NEXTAUTH_URL
  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL !== "http://localhost:3000") {
    return new URL(`${process.env.NEXTAUTH_URL.replace(/\/$/, "")}${path}`);
  }
  // Last resort
  return new URL(path, request.url);
}

export const config = {
  matcher: [
    "/superadmin/:path*",
    "/admin/:path*",
    "/agent/:path*",
    "/client/:path*",
  ],
};