import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// BYPASS AUTH - Tout passer sans vérification
// TODO: Remettre l'authentification quand le problème de cookies Coolify sera résolu

export async function middleware(request: NextRequest) {
  return NextResponse.next();
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