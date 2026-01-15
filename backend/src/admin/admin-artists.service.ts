import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { isBoss, type AccessActor } from '../common/access/access.types';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminArtistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(actor: AccessActor, opts?: { includeInactive?: boolean }) {
    try {
      // 構建查詢條件
      const whereCondition: any = {};
      
      if (!isBoss(actor)) {
        // ARTIST: only self (keeps appointment-creation UI simple and prevents cross-artist access)
        whereCondition.userId = actor.id;
      }
      if (!opts?.includeInactive) {
        whereCondition.active = true;
        whereCondition.user = { isActive: true };
      }

      const artists = await this.prisma.artist.findMany({
        where: whereCondition,
        include: { 
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              role: true,
              branchId: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
      console.log('DEBUG artists:', JSON.stringify(artists, null, 2));
      return artists;
    } catch (error) {
      console.error('ERROR in findAll artists:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            branchId: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    });

    if (!artist) {
      throw new NotFoundException('刺青師不存在');
    }

    return artist;
  }

  async create(data: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
    branchId?: string;
    bio?: string;
    speciality?: string;
    portfolioUrl?: string;
    photoUrl?: string;
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    return this.prisma.$transaction(async (tx) => {
      // 創建 User
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          hashedPassword,
          role: 'ARTIST',
          branchId: data.branchId || null,
        },
      });

      // 創建 Artist
      const artist = await tx.artist.create({
        data: {
          userId: user.id,
          branchId: data.branchId,
          displayName: data.name,
          bio: data.bio,
          speciality: data.speciality,
          portfolioUrl: data.portfolioUrl,
          photoUrl: data.photoUrl,
        },
        include: { 
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              role: true,
              branchId: true,
              isActive: true,
            }
          }
        },
      });

      return artist;
    });
  }

  async update(
    actor: AccessActor,
    meta: { ip?: string | null; userAgent?: string | null },
    id: string,
    data: {
    name?: string;
    email?: string;
    phone?: string;
    branchId?: string;
    bio?: string;
    speciality?: string;
    portfolioUrl?: string;
    photoUrl?: string;
    active?: boolean;
  }) {
    console.log('🔧 AdminArtistsService.update called with:', { id, data });
    const before = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            branchId: true,
            isActive: true,
          },
        },
        branch: { select: { id: true, name: true } },
      },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const artist = await tx.artist.findUnique({
        where: { id },
        include: { 
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              role: true,
              branchId: true,
              isActive: true,
            }
          }
        }
      });

      if (!artist) {
        throw new NotFoundException('刺青師不存在');
      }

      // 更新 User
      if (data.name || data.email || data.phone || data.branchId !== undefined) {
        console.log('🔄 Updating user with data:', { name: data.name, email: data.email, phone: data.phone, branchId: data.branchId });
        await tx.user.update({
          where: { id: artist.user.id },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.email !== undefined && { email: data.email || null }),
            ...(data.phone !== undefined && { phone: data.phone || null }),
            ...(data.branchId !== undefined && { branchId: data.branchId || null }),
          },
        });
      }

      // 更新 Artist
      console.log('🔄 Updating artist with data:', { bio: data.bio, speciality: data.speciality, portfolioUrl: data.portfolioUrl, photoUrl: data.photoUrl, active: data.active, name: data.name, branchId: data.branchId });
      const updatedArtist = await tx.artist.update({
        where: { id },
        data: {
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.speciality && { speciality: data.speciality }),
          ...(data.portfolioUrl !== undefined && { portfolioUrl: data.portfolioUrl || null }),
          ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl || null }),
          ...(data.active !== undefined && { active: data.active }),
          ...(data.name && { displayName: data.name }),
          ...(data.branchId !== undefined && { branchId: data.branchId }),
        },
        include: { 
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              role: true,
              branchId: true,
              isActive: true,
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
            }
          }
        },
      });

      return updatedArtist;
    });

    // best-effort audit
    try {
      const diff: Record<string, { from: unknown; to: unknown }> = {};
      const set = (k: string, from: unknown, to: unknown) => {
        if (from !== to) diff[k] = { from, to };
      };
      if (before) {
        set('artist.bio', (before as any).bio ?? null, (updated as any).bio ?? null);
        set('artist.speciality', (before as any).speciality ?? null, (updated as any).speciality ?? null);
        set('artist.portfolioUrl', (before as any).portfolioUrl ?? null, (updated as any).portfolioUrl ?? null);
        set('artist.photoUrl', (before as any).photoUrl ?? null, (updated as any).photoUrl ?? null);
        set('artist.active', (before as any).active ?? null, (updated as any).active ?? null);
        set('artist.displayName', (before as any).displayName ?? null, (updated as any).displayName ?? null);
        set('artist.branchId', (before as any).branchId ?? null, (updated as any).branchId ?? null);
        set('user.name', (before as any).user?.name ?? null, (updated as any).user?.name ?? null);
        set('user.email', (before as any).user?.email ?? null, (updated as any).user?.email ?? null);
        set('user.phone', (before as any).user?.phone ?? null, (updated as any).user?.phone ?? null);
        set('user.branchId', (before as any).user?.branchId ?? null, (updated as any).user?.branchId ?? null);
        set('user.isActive', (before as any).user?.isActive ?? null, (updated as any).user?.isActive ?? null);
        set('branch.name', (before as any).branch?.name ?? null, (updated as any).branch?.name ?? null);
      }

      if (Object.keys(diff).length > 0) {
        await this.audit.log({
          actor,
          action: 'ADMIN_ARTIST_UPDATE',
          entityType: 'ARTIST',
          entityId: id,
          diff,
          metadata: {
            targetUserId: (updated as any).user?.id ?? null,
            targetDisplayName: (updated as any).displayName ?? (updated as any).user?.name ?? null,
          },
          meta: { ip: meta?.ip ?? null, userAgent: meta?.userAgent ?? null },
        });
      }
    } catch {
      // ignore
    }

    return updated;
  }

  async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const artist = await tx.artist.findUnique({
        where: { id },
        include: { 
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              role: true,
              branchId: true,
              isActive: true,
            }
          }
        }
      });

      if (!artist) {
        throw new NotFoundException('刺青師不存在');
      }

      // 刪除 Artist
      await tx.artist.delete({
        where: { id },
      });

      // 刪除 User
      await tx.user.delete({
        where: { id: artist.user.id },
      });

      return { message: '刺青師已刪除' };
    });
  }
}
