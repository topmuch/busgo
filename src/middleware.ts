import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow everything except protected routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo") ||
    pathname === "/" ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Check JWT cookie
  const token =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!token) {
    return new NextResponse(null, { status: 302, headers: { Location: "/login" } });
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "busgo-superadmin-secret-change-me-2024"
    );
    const { payload } = await jwtVerify(token, secret);
    const p = payload as Record<string, unknown>;
    const inner = p.token as Record<string, unknown> | undefined;
    const role = (inner?.role || p.role) as string | undefined;

    if (pathname.startsWith("/superadmin") && role !== "superadmin") {
      return new NextResponse(null, { status: 302, headers: { Location: "/login" } });
    }
    if (pathname.startsWith("/admin") && role !== "admin" && role !== "superadmin") {
      return new NextResponse(null, { status: 302, headers: { Location: "/login" } });
    }

    return NextResponse.next();
  } catch {
    return new NextResponse(null, { status: 302, headers: { Location: "/login" } });
  }
}

export const config = {
  matcher: ["/superadmin/:path*", "/admin/:path*", "/agent/:path*", "/client/:path*", "/login"],
};