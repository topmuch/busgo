import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const SECRET = process.env.NEXTAUTH_SECRET || "busgo-superadmin-secret-change-me-2024";

function getRedirectPath(role: string): string {
  switch (role) {
    case "superadmin": return "/superadmin";
    case "admin": return "/admin";
    case "agent": return "/agent";
    default: return "/client";
  }
}

function redirectRelative(path: string): NextResponse {
  const response = new NextResponse(null, { status: 302 });
  response.headers.set("Location", path);
  return response;
}

export async function POST(request: NextRequest) {
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
      return redirectRelative("/login?error=missing");
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user) {
      return redirectRelative("/login?error=notfound");
    }

    if (!user.isActive) {
      return redirectRelative("/login?error=disabled");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return redirectRelative("/login?error=wrong");
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

    // 302 redirect with RELATIVE Location header + Set-Cookie
    const redirectPath = getRedirectPath(user.role);
    const response = redirectRelative(redirectPath);

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
    return redirectRelative("/login?error=server");
  }
}