export type AccessRole = 'BOSS' | 'ARTIST';

export interface JwtUser {
  id: string;
  role?: string | null;
  branchId?: string | null;
  email?: string | null;
}

export interface AccessActor {
  id: string;
  role: AccessRole;
  branchId?: string | null;
  // keep original role for debugging/migration purposes
  legacyRole?: string | null;
}

export function mapLegacyRoleToAccessRole(role: string | null | undefined): AccessRole | null {
  if (!role) return null;
  // Old system had multiple admin-ish roles. For now we collapse them into BOSS.
  // This makes the RBAC migration non-breaking while we gradually rewrite screens.
  const normalized = role.toUpperCase();
  if (normalized === 'BOSS') return 'BOSS';
  if (normalized === 'ARTIST') return 'ARTIST';
  if (normalized === 'BRANCH_MANAGER') return 'BOSS';
  if (normalized === 'SUPER_ADMIN') return 'BOSS';
  // Legacy role 'ADMIN' exists in some old code paths; treat as BOSS to avoid lockouts.
  if (normalized === 'ADMIN') return 'BOSS';
  return null;
}

export function buildActorFromJwtUser(user: JwtUser): AccessActor | null {
  const accessRole = mapLegacyRoleToAccessRole(user.role);
  if (!accessRole) return null;
  return {
    id: user.id,
    role: accessRole,
    branchId: user.branchId ?? null,
    legacyRole: user.role ?? null,
  };
}

export function isBoss(actor: AccessActor): boolean {
  return actor.role === 'BOSS';
}

export function isArtist(actor: AccessActor): boolean {
  return actor.role === 'ARTIST';
}


