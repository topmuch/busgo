import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const SECRET = process.env.NEXTAUTH_SECRET || "busgo-superadmin-secret-change-me-2024";

function getBaseUrl(request: NextRequest): string {
  // Use NEXTAUTH_URL if set (correct public URL in Coolify)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }
  // Fallback: reconstruct from forwarded headers
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

function getRedirectPath(role: string): string {
  switch (role) {
    case "superadmin": return "/superadmin";
    case "admin": return "/admin";
    case "agent": return "/agent";
    default: return "/client";
  }
}

export async function POST(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  try {
    let email: string | null = null;
    let password: string | null = null;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      email = body.email;
      password = body.password;
    } else {
      const formData = await request.formData();
      email = formData.get("email") as string;
      password = formData.get("password") as string;
    }

    if (!email || !password) {
      return NextResponse.redirect(`${baseUrl}/login?error=missing`);
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.redirect(`${baseUrl}/login?error=notfound`);
    }

    if (!user.isActive) {
      return NextResponse.redirect(`${baseUrl}/login?error=disabled`);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.redirect(`${baseUrl}/login?error=wrong`);
    }

    // Create JWT token
    const secret = new TextEncoder().encode(SECRET);
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ?? null,
      tenantSlug: user.tenant?.slug ?? null,
      tenantName: user.tenant?.name ?? null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    // Redirect to role-based dashboard using the PUBLIC base URL
    const redirectUrl = `${baseUrl}${getRedirectPath(user.role)}`;

    const response = NextResponse.redirect(redirectUrl, { status: 302 });

    response.cookies.set("next-auth.session-token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      secure: false,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.redirect(`${baseUrl}/login?error=server`);
  }
}