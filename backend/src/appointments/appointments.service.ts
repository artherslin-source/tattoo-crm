import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeAvailableSlots, dayBounds } from './availability.util';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}
  private maxHoldMin = 24 * 60; // 24h cap

  private clampEndToSameDay(startAt: Date, endAt: Date): Date {
    const dayEnd = new Date(startAt);
    dayEnd.setHours(23, 59, 0, 0);
    return endAt > dayEnd ? dayEnd : endAt;
  }

  private parsePreferredDateToLocalStart(preferredDate: string): Date {
    // preferredDate: YYYY-MM-DD, interpret as local day start to avoid timezone surprises
    const d = new Date(`${preferredDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('preferredDate 格式錯誤，需為 YYYY-MM-DD');
    }
    return d;
  }

  async createIntent(input: {
    userId: string;
    artistId?: string;
    serviceId?: string;
    branchId: string;
    contactId?: string;
    notes?: string;
    preferredDate: string; // YYYY-MM-DD
    holdMin?: number;
  }) {
    const startAt = this.parsePreferredDateToLocalStart(input.preferredDate);
    const holdMin = input.holdMin ?? 150;
    if (!Number.isInteger(holdMin) || holdMin <= 0) {
      throw new BadRequestException('保留時間必須為正整數（分鐘）');
    }
    if (holdMin > this.maxHoldMin) {
      throw new BadRequestException('保留時間不可超過 24 小時');
    }

    // For INTENT, do NOT lock schedule. We still need an endAt value (schema non-null).
    const endAt = startAt; // neutral placeholder; INTENT is excluded from conflicts.

    return this.prisma.appointment.create({
      data: {
        userId: input.userId,
        artistId: input.artistId,
        serviceId: input.serviceId,
        branchId: input.branchId,
        contactId: input.contactId,
        notes: input.notes,
        startAt,
        endAt,
        holdMin,
        status: 'INTENT',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        artist: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        branch: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async getAvailableSlots(input: {
    branchId: string;
    date: Date;
    artistId?: string;
    durationMin: number;
    stepMin?: number;
  }) {
    const stepMin = input.stepMin ?? 30;
    const weekday = input.date.getDay(); // 0-6 (Sun-Sat)
    const { start, end } = dayBounds(input.date);

    const branch = await this.prisma.branch.findUnique({
      where: { id: input.branchId },
      select: { businessHours: true },
    });

    // If no artist is specified (customer didn't choose), expose branch-level slots only (no appointment conflicts).
    if (!input.artistId) {
      return computeAvailableSlots({
        branchBusinessHours: branch?.businessHours ?? null,
        weekday,
        durationMin: input.durationMin,
        stepMin,
        availabilityRecords: [],
        appointmentBlocks: [],
        date: input.date,
      });
    }

    // Artist availability: specificDate overrides weekday; blocks are included via isBlocked=true.
    const availability = await this.prisma.artistAvailability.findMany({
      where: {
        artistId: input.artistId,
        OR: [
          { specificDate: { gte: start, lt: end } },
          { specificDate: null, weekday },
        ],
      },
      select: { startTime: true, endTime: true, isBlocked: true },
    });

    // Appointment conflicts for that artist on that day (ignore cancelled/no-show)
    const appts = await this.prisma.appointment.findMany({
      where: {
        branchId: input.branchId,
        artistId: input.artistId,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        startAt: { lt: end },
        endAt: { gt: start },
      },
      select: { startAt: true, endAt: true },
    });

    return computeAvailableSlots({
      branchBusinessHours: branch?.businessHours ?? null,
      weekday,
      durationMin: input.durationMin,
      stepMin,
      availabilityRecords: availability,
      appointmentBlocks: appts,
      date: input.date,
    });
  }

  async create(input: {
    userId: string;
    artistId?: string;
    serviceId?: string;
    startAt: Date;
    endAt?: Date;
    holdMin?: number;
    notes?: string;
    branchId: string;
    contactId?: string;
    cartSnapshot?: any;
  }) {
    const startAt = input.startAt;

    // Scheduling truth: holdMin (or derive from endAt-startAt, else default 150)
    const derivedMin = input.endAt
      ? Math.round((input.endAt.getTime() - startAt.getTime()) / 60000)
      : undefined;
    const holdMin = input.holdMin ?? (derivedMin && derivedMin > 0 ? derivedMin : 150);

    if (!Number.isInteger(holdMin) || holdMin <= 0) {
      throw new BadRequestException('保留時間必須為正整數（分鐘）');
    }
    if (holdMin > this.maxHoldMin) {
      throw new BadRequestException('保留時間不可超過 24 小時');
    }

    const computedEndAt = this.clampEndToSameDay(startAt, new Date(startAt.getTime() + holdMin * 60000));

    // V2: 檢查時間衝突（以 artistId 為主；未指定 artistId 則只做 branch-level 允許）
    if (input.artistId) {
      const conflict = await this.prisma.appointment.findFirst({
        where: {
          branchId: input.branchId,
          artistId: input.artistId,
          status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
          startAt: { lt: computedEndAt },
          endAt: { gt: startAt },
        },
      });
      if (conflict) throw new BadRequestException("該刺青師於此時段已已有預約");
    }

    return this.prisma.appointment.create({ 
      data: {
        userId: input.userId,
        artistId: input.artistId,
        serviceId: input.serviceId,
        branchId: input.branchId,
        contactId: input.contactId,
        notes: input.notes,
        startAt,
        endAt: computedEndAt,
        holdMin,
        status: "PENDING",
        cartSnapshot: input.cartSnapshot, // 從 contact 帶入購物車快照（忽略時長）
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        artist: { 
          select: { 
            id: true, 
            name: true, 
            email: true 
          } 
        },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        branch: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async myAppointments(userId: string) {
    return this.prisma.appointment.findMany({ 
      where: { userId }, 
      orderBy: { startAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        artist: true,
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        branch: { select: { id: true, name: true } },
        bill: { select: { id: true, billTotal: true, status: true, billType: true } },
        // cartSnapshot 是 JSON 字段，會自動包含在結果中，不需要在 include 中指定
      },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        artist: true,
        service: { select: { id: true, name: true, price: true, durationMin: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async update(id: string, status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED') {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
        artist: true,
        service: { select: { id: true, name: true, price: true, durationMin: true } },
      },
    });
  }

  // 管理員專用：查詢所有預約
  async findAll(userRole: string, userBranchId?: string) {
    const where: any = {};
    
    // 如果不是 BOSS，只能查看自己分店的預約
    if (userRole !== 'BOSS') {
      where.branchId = userBranchId;
    }

    return this.prisma.appointment.findMany({
      where,
      orderBy: { startAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        artist: true,
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        branch: { select: { id: true, name: true } },
        bill: { select: { id: true, billTotal: true, status: true, billType: true } },
      },
      // ✅ 包含 cartSnapshot（購物車結帳創建的預約會有此欄位）
    });
  }

  // 管理員專用：更新預約狀態
  async updateStatus(id: string, status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED') {
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id },
        select: { id: true },
      });
      
      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      // 訂單機制已移除：僅更新狀態
      const updateData: { status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' } = {
        status: status as 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED',
      };

      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: updateData,
        include: {
          user: { select: { id: true, name: true, email: true } },
          artist: true,
          service: { select: { id: true, name: true, price: true, durationMin: true } },
        },
      });

      return updatedAppointment;
    });
  }
}



