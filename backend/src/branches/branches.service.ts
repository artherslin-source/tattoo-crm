import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessActor } from '../common/access/access.types';
import { isBoss, isArtist } from '../common/access/access.types';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.branch.findMany({ 
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            users: true,
            artists: true,
            appointments: true,
            appointmentBills: true,
          }
        }
      }
    });
  }

  async findOne(id: string) {
    return this.prisma.branch.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          }
        },
        artists: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: {
            users: true,
            artists: true,
            appointments: true,
            appointmentBills: true,
          }
        }
      }
    });
  }

  async listAccessible(actor: AccessActor) {
    if (isBoss(actor)) return this.prisma.branch.findMany({ orderBy: { name: 'asc' } });

    // ARTIST: union of primary branchId + ArtistBranchAccess
    const ids = new Set<string>();
    if (actor.branchId) ids.add(actor.branchId);
    if (isArtist(actor)) {
      const rows = await this.prisma.artistBranchAccess.findMany({
        where: { userId: actor.id },
        select: { branchId: true },
      });
      for (const r of rows) ids.add(r.branchId);
    }
    return this.prisma.branch.findMany({ where: { id: { in: Array.from(ids) } }, orderBy: { name: 'asc' } });
  }
}



