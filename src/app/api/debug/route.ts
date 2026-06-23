import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const info: Record<string, unknown> = {};

  // 1. Environment
  info.env = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_SECRET_VALUE: process.env.NEXTAUTH_SECRET || "(not set)",
    PORT: process.env.PORT,
  };

  // 2. Cookies from request
  const cookies = request.cookies.getAll();
  info.cookies = cookies.map(c => ({ name: c.name, hasValue: !!c.value, length: c.value?.length }));

  // 3. Database test
  try {
    const userCount = await db.user.count();
    info.db = { status: "connected", userCount };

    const users = await db.user.findMany({ select: { id: true, email: true, role: true, isActive: true } });
    info.users = users;
  } catch (e: unknown) {
    info.db = { status: "error", message: (e as Error).message };
  }

  // 4. Test bcrypt
  try {
    const bcrypt = (await import("bcryptjs")).default;
    const hash = await bcrypt.hash("test", 4);
    info.bcrypt = { status: "ok", hashLength: hash.length };
  } catch (e: unknown) {
    info.bcrypt = { status: "error", message: (e as Error).message };
  }

  // 5. Test JWT
  try {
    const { SignJWT, jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "busgo-superadmin-secret-change-me-2024");
    const token = await new SignJWT({ test: "ok" }).setProtectedHeader({ alg: "HS256" }).sign(secret);
    const { payload } = await jwtVerify(token, secret);
    info.jwt = { status: "ok", verified: (payload as Record<string, unknown>).test };
  } catch (e: unknown) {
    info.jwt = { status: "error", message: (e as Error).message };
  }

  // 6. Try login as superadmin
  try {
    const bcrypt = (await import("bcryptjs")).default;
    const user = await db.user.findUnique({ where: { email: "superadmin@busgo.com" } });
    if (user) {
      const valid = await bcrypt.compare("Demo1234!", user.password);
      info.loginTest = { userFound: true, passwordValid: valid, role: user.role, isActive: user.isActive };
    } else {
      info.loginTest = { userFound: false };
    }
  } catch (e: unknown) {
    info.loginTest = { status: "error", message: (e as Error).message };
  }

  return NextResponse.json(info, { headers: { "Content-Type": "application/json" } });
}