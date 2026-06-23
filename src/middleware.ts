import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow ALL API routes and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Allow login page
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // For protected routes: check JWT cookie
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

  // No token -> redirect to /login using RELATIVE path
  if (!token) {
    const response = new NextResponse(null, { status: 302 });
    response.headers.set("Location", "/login");
    return response;
  }

  // Verify token
  try {
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "busgo-superadmin-secret-change-me-2024"
    );
    const { payload } = await jwtVerify(token, secret);
    const p = payload as Record<string, unknown>;
    const inner = p.token as Record<string, unknown> | undefined;
    const role = (inner?.role || p.role) as string | undefined;

    if (pathname.startsWith("/superadmin") && role !== "superadmin") {
      const response = new NextResponse(null, { status: 302 });
      response.headers.set("Location", "/login");
      return response;
    }
    if (pathname.startsWith("/admin") && role !== "admin" && role !== "superadmin") {
      const response = new NextResponse(null, { status: 302 });
      response.headers.set("Location", "/login");
      return response;
    }

    return NextResponse.next();
  } catch {
    const response = new NextResponse(null, { status: 302 });
    response.headers.set("Location", "/login");
    return response;
  }
}

export const config = {
  matcher: [
    "/superadmin/:path*",
    "/admin/:path*",
    "/agent/:path*",
    "/client/:path*",
    "/login",
  ],
};