import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';
import { isBoss } from '../common/access/access.types';

@Controller('admin/audit-logs')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class AdminAuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  private getMetaString(meta: unknown, key: string): string | null {
    if (!meta || typeof meta !== 'object') return null;
    const v = (meta as any)[key];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  }

  @Get()
  async list(
    @Actor() actor: AccessActor,
    @Query('roles') rolesRaw?: string,
    @Query('artistUserId') artistUserId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
    @Query('limit') limitRaw?: string,
    @Query('cursor') cursor?: string,
  ) {
    if (!isBoss(actor)) throw new BadRequestException('BOSS only');

    const limit = Math.max(1, Math.min(100, Number(limitRaw || 50)));
    const where: any = {};

    if (rolesRaw && rolesRaw.trim()) {
      const allowed = new Set(['ARTIST', 'BOSS']);
      const roles = rolesRaw
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s) => !!s && allowed.has(s));
      if (roles.length > 0) {
        where.actorRole = { in: Array.from(new Set(roles)) };
      }
    }

    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) {
        const d = new Date(from);
        if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid from');
        where.createdAt.gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid to');
        where.createdAt.lte = d;
      }
    }

    if (artistUserId) {
      where.OR = [
        { actorUserId: artistUserId },
        // metadata.userId (self profile update) or metadata.targetUserId (admin update)
        { metadata: { path: ['userId'], equals: artistUserId } },
        { metadata: { path: ['targetUserId'], equals: artistUserId } },
      ];
    }

    if (q && q.trim()) {
      const qq = q.trim();
      where.AND = where.AND ?? [];
      where.AND.push({
        OR: [
          { action: { contains: qq, mode: 'insensitive' } },
          { entityType: { contains: qq, mode: 'insensitive' } },
          { entityId: { contains: qq, mode: 'insensitive' } },
          { actorUserId: { contains: qq, mode: 'insensitive' } },
        ],
      });
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        createdAt: true,
        actorUserId: true,
        actorRole: true,
        branchId: true,
        action: true,
        entityType: true,
        entityId: true,
        ip: true,
        userAgent: true,
        diff: true,
        metadata: true,
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    // Enrich for UI readability: actorName / branchName / targetName (best-effort, avoid N+1).
    const userIds = new Set<string>();
    const branchIds = new Set<string>();
    for (const it of items) {
      if (it.actorUserId) userIds.add(it.actorUserId);
      if (it.branchId) branchIds.add(it.branchId);
      const metaUserId = this.getMetaString(it.metadata, 'userId');
      const metaTargetUserId = this.getMetaString(it.metadata, 'targetUserId');
      if (metaUserId) userIds.add(metaUserId);
      if (metaTargetUserId) userIds.add(metaTargetUserId);
    }

    const [users, branches] = await Promise.all([
      userIds.size
        ? this.prisma.user.findMany({
            where: { id: { in: Array.from(userIds) } },
            select: { id: true, name: true, phone: true, email: true },
          })
        : Promise.resolve([]),
      branchIds.size
        ? this.prisma.branch.findMany({
            where: { id: { in: Array.from(branchIds) } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const userNameById = new Map(
      users.map((u) => [
        u.id,
        (u.name || u.phone || u.email || '').trim() || null,
      ]),
    );
    const branchNameById = new Map(branches.map((b) => [b.id, (b.name || '').trim() || null]));

    const enriched = items.map((it) => {
      const metaUserId = this.getMetaString(it.metadata, 'userId');
      const metaTargetUserId = this.getMetaString(it.metadata, 'targetUserId');
      const targetUserId = metaTargetUserId || metaUserId || null;

      return {
        ...it,
        actorName: it.actorUserId ? userNameById.get(it.actorUserId) || null : null,
        branchName: it.branchId ? branchNameById.get(it.branchId) || null : null,
        targetUserId,
        targetName: targetUserId ? userNameById.get(targetUserId) || null : null,
      };
    });

    return { items: enriched, nextCursor };
  }
}

