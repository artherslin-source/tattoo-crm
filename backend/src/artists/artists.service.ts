import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {
    console.log('ArtistsService constructor called, prisma:', !!this.prisma);
  }

  private async attachArtistGroupKey<T extends { userId?: string; user?: { id?: string } }>(
    rows: T[],
  ): Promise<Array<T & { artistGroupKey: string }>> {
    const userIds = Array.from(
      new Set(
        rows
          .map((r) => r.userId || r.user?.id)
          .filter((v): v is string => !!v),
      ),
    );
    if (userIds.length === 0) return rows.map((r) => ({ ...(r as any), artistGroupKey: (r as any).userId || (r as any).user?.id || '' }));

    // Map artistUserId -> loginUserId (group key). If no link, group key defaults to userId.
    const links = await this.prisma.artistLoginLink.findMany({
      where: { artistUserId: { in: userIds } },
      select: { artistUserId: true, loginUserId: true },
    });
    const map = new Map<string, string>();
    for (const l of links) map.set(l.artistUserId, l.loginUserId);

    return rows.map((r) => {
      const uid = (r as any).userId || (r as any).user?.id || '';
      return { ...(r as any), artistGroupKey: map.get(uid) || uid };
    });
  }

  async listByBranch(branchId: string) {
    const rows = await this.prisma.artist.findMany({ 
      where: { branchId }, 
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
        branch: { select: { id: true, name: true } },
      } 
    });
    return this.attachArtistGroupKey(rows as any);
  }

  async availability(artistId: string, date: string, durationMinutes: number) {
    // Compute slots based on availability rules and existing appointments
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');

    const [rules, appointments] = await Promise.all([
      this.prisma.artistAvailability.findMany({ where: { artistId, OR: [ { specificDate: dayStart }, { weekday: new Date(date).getUTCDay() } ] } }),
      this.prisma.appointment.findMany({ where: { artistId, startAt: { gte: dayStart, lte: dayEnd } } }),
    ]);

    // Convert rules to available intervals (simple implementation; can be improved)
    const intervals: Array<{ start: Date; end: Date }> = [];
    for (const r of rules) {
      if (r.isBlocked) continue;
      const [sh, sm] = r.startTime.split(':').map(Number);
      const [eh, em] = r.endTime.split(':').map(Number);
      const start = new Date(dayStart);
      start.setUTCHours(sh, sm, 0, 0);
      const end = new Date(dayStart);
      end.setUTCHours(eh, em, 0, 0);
      intervals.push({ start, end });
    }

    // Remove occupied times
    const occupied: Array<{ start: Date; end: Date }> = appointments.map(a => ({ start: a.startAt, end: a.endAt }));

    // Slice intervals into slots
    const slots: string[] = [];
    const stepMs = durationMinutes * 60 * 1000;
    for (const { start, end } of intervals) {
      for (let t = start.getTime(); t + stepMs <= end.getTime(); t += stepMs) {
        const slotStart = new Date(t);
        const slotEnd = new Date(t + stepMs);
        const overlaps = occupied.some(o => !(slotEnd <= o.start || slotStart >= o.end));
        if (!overlaps) slots.push(slotStart.toISOString());
      }
    }
    return { date, durationMinutes, slots };
  }

  async getPortfolioPublic(artistUserId: string) {
    // IMPORTANT:
    // - System allows artists with the same displayName (different phone/accounts).
    // - Do NOT merge portfolios by name; it can leak/merge unrelated artists’ works.
    // If we want shared portfolio across accounts in the future, introduce an explicit groupId.
    return this.prisma.portfolioItem.findMany({
      where: { artistId: artistUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getArtistPublicByUserId(artistUserId: string) {
    const row = await this.prisma.artist.findFirst({
      where: { userId: artistUserId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });
    if (!row) return row;
    const [withKey] = await this.attachArtistGroupKey([row as any]);
    return withKey;
  }

  // 管理功能方法
  async getAllArtists(userRole: string, userBranchId?: string) {
    console.log('getAllArtists called, prisma:', !!this.prisma);
    console.log('getAllArtists called, prisma.artist:', !!this.prisma?.artist);
    
    const where: any = {};
    
    // 如果不是 BOSS，只能查看自己分店的刺青師
    if (userRole !== 'BOSS') {
      where.branchId = userBranchId;
    }

    const rows = await this.prisma.artist.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.attachArtistGroupKey(rows as any);
  }

  async createArtist(data: { name: string; email?: string; phone?: string; branchId: string; speciality?: string; specialties?: string[] }) {
    // 創建用戶
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        role: 'ARTIST',
        branchId: data.branchId || null,
        isActive: true,
        hashedPassword: 'temp_password_12345678', // 臨時密碼，需要後續修改
      },
    });

    // 創建刺青師
    return this.prisma.artist.create({
      data: {
        userId: user.id,
        branchId: data.branchId,
        displayName: data.name,
        speciality: data.speciality,
      },
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async updateArtist(artistId: string, data: { name?: string; email?: string; speciality?: string; specialties?: string[] }) {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      include: { user: true },
    });

    if (!artist) {
      throw new Error('刺青師不存在');
    }

    // 更新用戶信息
    if (data.name || data.email) {
      await this.prisma.user.update({
        where: { id: artist.userId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email && { email: data.email }),
        },
      });
    }

    // 更新刺青師信息
    return this.prisma.artist.update({
      where: { id: artistId },
      data: {
        ...(data.speciality !== undefined && { speciality: data.speciality }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async deleteArtist(artistId: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      include: { user: true },
    });

    if (!artist) {
      throw new Error('刺青師不存在');
    }

    // 刪除刺青師記錄
    await this.prisma.artist.delete({
      where: { id: artistId },
    });

    // 刪除用戶記錄
    await this.prisma.user.delete({
      where: { id: artist.userId },
    });

    return { message: '刺青師已刪除' };
  }
}



