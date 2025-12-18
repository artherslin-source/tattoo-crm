export type AccessRole = 'BOSS' | 'ARTIST' | 'MEMBER' | string;

export function normalizeAccessRole(role: string | null | undefined): AccessRole | null {
  if (!role) return null;
  const r = role.toUpperCase();
  if (r === 'BOSS') return 'BOSS';
  if (r === 'ARTIST') return 'ARTIST';
  // legacy admin-ish roles map to BOSS
  if (r === 'BRANCH_MANAGER') return 'BOSS';
  if (r === 'SUPER_ADMIN') return 'BOSS';
  if (r === 'ADMIN') return 'BOSS';
  return r;
}

export function hasAdminAccess(role: string | null | undefined): boolean {
  const ar = normalizeAccessRole(role);
  return ar === 'BOSS' || ar === 'ARTIST';
}

export function isBossRole(role: string | null | undefined): boolean {
  return normalizeAccessRole(role) === 'BOSS';
}


