import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { isBoss, isArtist, type AccessActor } from './access.types';

function normalizeBranchId(raw?: string | null): string | null {
  const v = String(raw ?? '').trim();
  if (!v || v === 'all') return null;
  return v;
}

export async function getLinkedArtistUserIds(prisma: PrismaService, loginUserId: string): Promise<string[]> {
  const rows = await prisma.artistLoginLink.findMany({
    where: { loginUserId },
    select: { artistUserId: true },
  });
  return rows.map((r) => r.artistUserId);
}

export async function getAllArtistUserIdsForLogin(prisma: PrismaService, loginUserId: string): Promise<string[]> {
  const linked = await getLinkedArtistUserIds(prisma, loginUserId);
  const ids = new Set<string>([loginUserId, ...linked]);
  return Array.from(ids);
}

export async function resolveAccessibleBranchIdsForArtist(
  prisma: PrismaService,
  actor: AccessActor,
  allArtistUserIds: string[],
): Promise<string[]> {
  if (isBoss(actor)) return [];
  const ids = new Set<string>();

  // Actor primary branch
  if (actor.branchId) ids.add(actor.branchId);

  // Explicit grants for the login user (current actor)
  if (isArtist(actor)) {
    const rows = await prisma.artistBranchAccess.findMany({
      where: { userId: actor.id },
      select: { branchId: true },
    });
    for (const r of rows) ids.add(r.branchId);
  }

  // Also include the "home" branch of linked artist identities (their User.branchId / Artist.branchId),
  // so that selecting that branch is always allowed even if grants are missing.
  const users = await prisma.user.findMany({
    where: { id: { in: allArtistUserIds } },
    select: { id: true, branchId: true },
  });
  for (const u of users) {
    if (u.branchId) ids.add(u.branchId);
  }

  const artists = await prisma.artist.findMany({
    where: { userId: { in: allArtistUserIds } },
    select: { userId: true, branchId: true },
  });
  for (const a of artists) {
    if (a.branchId) ids.add(a.branchId);
  }

  return Array.from(ids);
}

export async function resolveArtistScope(prisma: PrismaService, actor: AccessActor, rawBranchId?: string | null) {
  const selectedBranchId = normalizeBranchId(rawBranchId);

  if (isBoss(actor)) {
    return {
      selectedBranchId,
      allArtistUserIds: [] as string[],
      accessibleBranchIds: [] as string[],
    };
  }

  if (!isArtist(actor)) {
    // Non-boss non-artist: treat as single-branch scope at actor.branchId
    const b = actor.branchId ?? null;
    if (selectedBranchId && b && selectedBranchId !== b) throw new ForbiddenException('Insufficient branch access');
    return {
      selectedBranchId,
      allArtistUserIds: [actor.id],
      accessibleBranchIds: b ? [b] : [],
    };
  }

  const allArtistUserIds = await getAllArtistUserIdsForLogin(prisma, actor.id);
  const accessibleBranchIds = await resolveAccessibleBranchIdsForArtist(prisma, actor, allArtistUserIds);
  if (selectedBranchId && !accessibleBranchIds.includes(selectedBranchId)) {
    throw new ForbiddenException('Insufficient branch access');
  }

  return { selectedBranchId, allArtistUserIds, accessibleBranchIds };
}

export async function resolveTargetArtistUserIdForBranch(
  prisma: PrismaService,
  actor: AccessActor,
  rawBranchId?: string | null,
): Promise<string> {
  if (!isArtist(actor)) return actor.id;
  const branchId = normalizeBranchId(rawBranchId);
  if (!branchId) throw new ForbiddenException('branchId is required to resolve target artist identity');

  const allArtistUserIds = await getAllArtistUserIdsForLogin(prisma, actor.id);
  const accessibleBranchIds = await resolveAccessibleBranchIdsForArtist(prisma, actor, allArtistUserIds);
  if (!accessibleBranchIds.includes(branchId)) throw new ForbiddenException('Insufficient branch access');

  const found = await prisma.user.findFirst({
    where: { id: { in: allArtistUserIds }, branchId },
    select: { id: true },
  });
  if (found?.id) return found.id;

  // Fallback: try Artist.branchId mapping
  const foundArtist = await prisma.artist.findFirst({
    where: { userId: { in: allArtistUserIds }, branchId },
    select: { userId: true },
  });
  if (foundArtist?.userId) return foundArtist.userId;

  throw new ForbiddenException('Cannot resolve target artist identity for selected branch');
}

