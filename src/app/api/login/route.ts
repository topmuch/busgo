import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { validateBody, schemas } from "@/lib/api-validation";

const SECRET = process.env.NEXTAUTH_SECRET || "busgo-superadmin-secret-change-me-2024";

function getRedirectPath(role: string): string {
  switch (role) {
    case "superadmin": return "/superadmin";
    case "admin": return "/admin";
    case "agent": return "/agent";
    default: return "/client";
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // Support both JSON and form-encoded bodies.
    // JSON path uses Zod validation; form path is used by the SSR login fallback.
    let email: string;
    let password: string;

    if (contentType.includes("application/json")) {
      const body = await validateBody(request, schemas.login);
      if (body instanceof NextResponse) return body; // validation error
      email = body.email;
      password = body.password;
    } else {
      const formData = await request.formData();
      email = (formData.get("email") as string) || "";
      password = (formData.get("password") as string) || "";
      if (!email || !password) {
        return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
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

    // Return JSON with Set-Cookie header
    const response = NextResponse.json({
      ok: true,
      redirect: getRedirectPath(user.role),
      user: { role: user.role, name: user.name, email: user.email },
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
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}