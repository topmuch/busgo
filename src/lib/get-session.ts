// BYPASS AUTH - Retourne toujours un utilisateur superadmin fictif
// TODO: Remettre l'authentification quand le problème de cookies Coolify sera résolu

export async function getServerSession() {
  return {
    user: {
      id: "bypass-001",
      email: "superadmin@busgo.com",
      name: "Super Admin",
      role: "superadmin",
      tenantId: undefined as string | undefined,
      tenantSlug: undefined as string | undefined,
      tenantName: undefined as string | undefined,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } as const;
}