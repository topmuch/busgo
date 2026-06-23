import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const publicPaths = ["/login", "/api/auth", "/api/login", "/api/debug"];
const cookieNames = ["next-auth.session-token", "__Secure-next-auth.session-token"];

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
    (pathname.startsWith("/api") && !pathname.startsWith("/api/superadmin"))
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

  // Get JWT token (check both cookie names)
  let token: string | undefined;
  for (const name of cookieNames) {
    token = request.cookies.get(name)?.value;
    if (token) break;
  }
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "busgo-superadmin-secret-change-me-2024"
    );
    const { payload } = await jwtVerify(token, secret);
    // Custom API token puts role at top level, NextAuth puts it in payload.token.role
    const p = (payload as Record<string, unknown>);
    const inner = p.token as Record<string, unknown> | undefined;
    const role = inner?.role || p.role;

    if (!role || !requiredRoles.includes(role as string)) {
      // If user is authenticated but wrong role, redirect to unauthorized or login
      if (role) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/superadmin/:path*",
    "/admin/:path*",
    "/agent/:path*",
    "/client/:path*",
  ],
};