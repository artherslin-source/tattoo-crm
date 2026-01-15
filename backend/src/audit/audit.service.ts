import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditLogInput } from './audit.types';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Best-effort audit log. Never throw to caller.
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      const actor = input.actor ?? null;
      const meta = input.meta ?? null;
      await this.prisma.auditLog.create({
        data: {
          actorUserId: actor?.id ?? null,
          actorRole: actor?.role ?? null,
          branchId: meta?.branchId ?? actor?.branchId ?? null,
          action: input.action,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          ip: meta?.ip ?? null,
          userAgent: meta?.userAgent ?? null,
          diff: (input.diff as any) ?? undefined,
          metadata: (input.metadata as any) ?? undefined,
        },
      });
    } catch (e) {
      // best-effort; ignore failures
      return;
    }
  }
}

