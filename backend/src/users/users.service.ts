import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessActor } from '../common/access/access.types';
import { BillingService } from '../billing/billing.service';
import { AuditService } from '../audit/audit.service';

interface UpdateUserDto {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string; // 刺青師介紹
  photoUrl?: string; // 刺青師照片
  bookingLatestStartTime?: string; // ARTIST：最晚可預約開始時間（HH:mm）
  booking24hEnabled?: boolean; // ARTIST：啟動 24 小時制
}

interface GetUsersQuery {
  branchId?: string;
  role?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly audit: AuditService,
  ) {}

  async listMyBills(userId: string) {
    const bills = await this.prisma.appointmentBill.findMany({
      where: {
        customerId: userId,
        status: { not: 'VOID' },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        branch: { select: { id: true, name: true } },
        artist: { select: { id: true, name: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            nameSnapshot: true,
            basePriceSnapshot: true,
            finalPriceSnapshot: true,
            variantsSnapshot: true,
            notes: true,
            sortOrder: true,
          },
        },
        payments: {
          orderBy: { paidAt: 'asc' },
          select: {
            id: true,
            amount: true,
            method: true,
            paidAt: true,
            notes: true,
          },
        },
      },
    });

    return bills.map((b) => {
      const paidTotal = b.payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        ...b,
        summary: {
          paidTotal,
          dueTotal: b.billTotal - paidTotal,
        },
      };
    });
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        branchId: true,
        bookingLatestStartTime: true,
        booking24hEnabled: true,
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        },
        member: {
          select: {
            totalSpent: true,
            balance: true,
            membershipLevel: true,
          }
        },
        artist: {
          select: {
            id: true,
            bio: true,
            speciality: true,
            portfolioUrl: true,
            photoUrl: true,
            displayName: true,
          }
        },
        createdAt: true,
        lastLogin: true,
        status: true,
      },
    });
  }

  async getUsers(query: GetUsersQuery, userRole: string, userBranchId?: string) {
    const { branchId, role, page = 1, limit = 10 } = query;
    
    // 構建 where 條件
    const where: any = {};
    
    // 如果不是 BOSS，只能查看自己分店的用戶
    if (userRole !== 'BOSS') {
      where.branchId = userBranchId;
    } else if (branchId) {
      // BOSS 可以指定分店查看
      where.branchId = branchId;
    }
    
    if (role) {
      where.role = role;
    }

    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          branchId: true,
          branch: {
            select: {
              id: true,
              name: true,
            }
          },
          member: {
            select: {
              totalSpent: true,
              balance: true,
              membershipLevel: true,
            }
          },
          createdAt: true,
          lastLogin: true,
          status: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateMe(
    userId: string,
    updateUserDto: UpdateUserDto,
    opts?: { actor?: AccessActor | null; ip?: string | null; userAgent?: string | null },
  ) {
    // 如果更新手機號碼，檢查唯一性
    if (updateUserDto.phone !== undefined && updateUserDto.phone !== null && updateUserDto.phone.trim() !== '') {
      // 驗證手機號碼格式（至少10位數字）
      if (!/^[0-9]{10,}$/.test(updateUserDto.phone)) {
        throw new BadRequestException('手機號碼格式不正確，請輸入至少10位數字');
      }

      // 檢查手機號碼是否已被其他用戶使用
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: updateUserDto.phone },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('此手機號碼已被其他用戶使用');
      }
    }

    const updateData: any = {};
    if (updateUserDto.name !== undefined) updateData.name = updateUserDto.name;
    if (updateUserDto.phone !== undefined) {
      // 如果手機號碼是空字串，設為 null
      updateData.phone = updateUserDto.phone === '' ? null : updateUserDto.phone;
    }
    if (updateUserDto.avatarUrl !== undefined) updateData.avatarUrl = updateUserDto.avatarUrl;

    if (updateUserDto.booking24hEnabled !== undefined) {
      updateData.booking24hEnabled = !!updateUserDto.booking24hEnabled;
    }

    if (updateUserDto.bookingLatestStartTime !== undefined) {
      const v = String(updateUserDto.bookingLatestStartTime || '').trim();
      if (v === '') {
        updateData.bookingLatestStartTime = null;
      } else {
        // HH:mm validation (00:00-23:59)
        if (!/^\d{2}:\d{2}$/.test(v)) {
          throw new BadRequestException('bookingLatestStartTime must be HH:mm');
        }
        const [hh, mm] = v.split(':').map((x) => Number(x));
        if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
          throw new BadRequestException('bookingLatestStartTime invalid');
        }
        updateData.bookingLatestStartTime = v;
      }
    }

    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        branchId: true,
        artist: { select: { id: true, bio: true, photoUrl: true } },
      },
    });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        branchId: true,
        bookingLatestStartTime: true,
        booking24hEnabled: true,
        createdAt: true,
        lastLogin: true,
        status: true,
        artist: {
          select: {
            id: true,
            bio: true,
            speciality: true,
            portfolioUrl: true,
            photoUrl: true,
            displayName: true,
          }
        },
      },
    });

    // 如果用戶是刺青師且有 bio 或 photoUrl 更新，同時更新 Artist 表
    if (updatedUser.role === 'ARTIST' && updatedUser.artist) {
      const artistUpdateData: any = {};
      if (updateUserDto.bio !== undefined) artistUpdateData.bio = updateUserDto.bio;
      if (updateUserDto.photoUrl !== undefined) artistUpdateData.photoUrl = updateUserDto.photoUrl;
      
      if (Object.keys(artistUpdateData).length > 0) {
        // Sync across cross-branch linked artist identities (ArtistLoginLink):
        // - profile page edits should reflect on homepage artist card even if the same person has multiple branch artist users.
        // - best-effort: if no link exists, we just update the current artist record.
        let loginUserId = userId;
        const link = await this.prisma.artistLoginLink.findFirst({
          where: {
            OR: [{ loginUserId: userId }, { artistUserId: userId }],
          },
          select: { loginUserId: true },
        });
        if (link?.loginUserId) loginUserId = link.loginUserId;

        const linked = await this.prisma.artistLoginLink.findMany({
          where: { loginUserId },
          select: { artistUserId: true },
        });
        const userIdsToSync = Array.from(
          new Set([loginUserId, ...linked.map((l) => l.artistUserId)].filter(Boolean)),
        );

        if (userIdsToSync.length > 0) {
          await this.prisma.artist.updateMany({
            where: { userId: { in: userIdsToSync } },
            data: artistUpdateData,
          });
        } else {
          await this.prisma.artist.update({
            where: { id: updatedUser.artist.id },
            data: artistUpdateData,
          });
        }

        // 重新獲取更新後的 artist 信息
        const artist = await this.prisma.artist.findUnique({
          where: { id: updatedUser.artist.id },
          select: {
            id: true,
            bio: true,
            speciality: true,
            portfolioUrl: true,
            photoUrl: true,
            displayName: true,
          }
        });
        if (artist) {
          updatedUser.artist = artist;
        }
      }
    }

    // best-effort audit for artist profile changes
    try {
      if (updatedUser.role === 'ARTIST') {
        const diff: Record<string, { from: unknown; to: unknown }> = {};
        const set = (k: string, from: unknown, to: unknown) => {
          if (from !== to) diff[k] = { from, to };
        };
        set('user.name', (before as any)?.name ?? null, (updatedUser as any)?.name ?? null);
        set('user.phone', (before as any)?.phone ?? null, (updatedUser as any)?.phone ?? null);
        set('artist.bio', (before as any)?.artist?.bio ?? null, (updatedUser as any)?.artist?.bio ?? null);
        set('artist.photoUrl', (before as any)?.artist?.photoUrl ?? null, (updatedUser as any)?.artist?.photoUrl ?? null);
        if (Object.keys(diff).length > 0) {
          await this.audit.log({
            actor: opts?.actor ?? ({ id: userId, role: updatedUser.role, branchId: updatedUser.branchId } as any),
            action: 'ARTIST_PROFILE_UPDATE',
            entityType: 'ARTIST',
            entityId: (updatedUser as any).artist?.id ?? null,
            diff,
            metadata: { userId },
            meta: { ip: opts?.ip ?? null, userAgent: opts?.userAgent ?? null },
          });
        }
      }
    } catch {
      // ignore
    }

    return updatedUser;
  }

  // 財務相關方法
  async updateUserFinancials(userId: string, updates: {
    totalSpent?: number;
    balance?: number;
    membershipLevel?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 確保用戶有 Member 記錄
      const member = await tx.member.findUnique({
        where: { userId },
      });

      if (!member) {
        // 如果沒有 Member 記錄，創建一個
        await tx.member.create({
          data: {
            userId,
            totalSpent: 0,
            balance: 0,
          },
        });
      }

      // 更新 Member 記錄
      const updatedMember = await tx.member.update({
        where: { userId },
        data: updates,
      });

      // 返回用戶和財務資訊
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          member: {
            select: {
              totalSpent: true,
              balance: true,
              membershipLevel: true,
            }
          }
        },
      });

      return user;
    });
  }

  async addTopUp(
    actor: AccessActor,
    userId: string,
    amount: number,
    opts?: { method?: string; notes?: string },
  ) {
    // Delegate to Billing: always create bill + payment + balance update
    return this.billing.createStoredValueTopupBill(actor, {
      customerId: userId,
      amount,
      method: opts?.method || 'CASH',
      notes: opts?.notes || 'users.topup',
    });
  }

  async processPayment(userId: string, amount: number, useStoredValue: boolean = false) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.findUnique({
        where: { userId },
      });

      if (!member) {
        throw new Error('Member record not found');
      }

      if (useStoredValue && member.balance < amount) {
        throw new Error('Insufficient stored value balance');
      }

      const updateData: any = {
        totalSpent: { increment: amount },
      };

      if (useStoredValue) {
        updateData.balance = { decrement: amount };
      }

      await tx.member.update({
        where: { userId },
        data: updateData,
      });

      // 返回用戶和財務資訊
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          member: {
            select: {
              totalSpent: true,
              balance: true,
              membershipLevel: true,
            }
          }
        },
      });

      return user;
    });
  }
}



