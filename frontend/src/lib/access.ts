export type AccessRole = 'BOSS' | 'ARTIST' | 'MEMBER' | string;

function readFromLocalStorage(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToLocalStorage(key: string, val: string) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, val);
  } catch {}
}

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

export function isArtistRole(role: string | null | undefined): boolean {
  return normalizeAccessRole(role) === 'ARTIST';
}

export function getAccessToken(): string | null {
  return readFromLocalStorage('accessToken');
}

export function getRefreshToken(): string | null {
  return readFromLocalStorage('refreshToken');
}

export function saveTokens(accessToken: string, refreshToken?: string, userRole?: string, userBranchId?: string) {
  writeToLocalStorage('accessToken', accessToken);
  if (refreshToken) writeToLocalStorage('refreshToken', refreshToken);
  if (userRole) writeToLocalStorage('userRole', userRole);
  if (userBranchId) writeToLocalStorage('userBranchId', userBranchId);
}

export function getUserRole(): AccessRole | null {
  const role = readFromLocalStorage('userRole');
  return normalizeAccessRole(role);
}

export function getUserBranchId(): string | null {
  return readFromLocalStorage('userBranchId');
}

export function clearTokens(): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('refreshToken');
    window.localStorage.removeItem('userRole');
    window.localStorage.removeItem('userBranchId');
  } catch {}
}


