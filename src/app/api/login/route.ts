import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const SECRET = process.env.NEXTAUTH_SECRET || "busgo-superadmin-secret-change-me-2024";

function getRedirectUrl(role: string): string {
  switch (role) {
    case "superadmin": return "/superadmin";
    case "admin": return "/admin";
    case "agent": return "/agent";
    default: return "/client";
  }
}

export async function POST(request: NextRequest) {
  try {
    // Support both JSON body and form data
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
      // For form submissions, redirect back to login with error
      if (!contentType.includes("application/json")) {
        return NextResponse.redirect(new URL("/login?error=missing", request.url));
      }
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user) {
      if (!contentType.includes("application/json")) {
        return NextResponse.redirect(new URL("/login?error=notfound", request.url));
      }
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 401 });
    }

    if (!user.isActive) {
      if (!contentType.includes("application/json")) {
        return NextResponse.redirect(new URL("/login?error=disabled", request.url));
      }
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      if (!contentType.includes("application/json")) {
        return NextResponse.redirect(new URL("/login?error=wrong", request.url));
      }
      return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
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

    // Determine redirect destination
    const redirectUrl = getRedirectUrl(user.role);

    // Return 302 redirect with Set-Cookie header (browser handles everything natively)
    const response = NextResponse.redirect(new URL(redirectUrl, request.url), {
      status: 302,
    });

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
    return NextResponse.redirect(new URL("/login?error=server", request.url));
  }
}