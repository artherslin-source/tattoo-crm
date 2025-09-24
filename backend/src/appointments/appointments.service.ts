import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: { userId: string; artistId?: string; serviceId?: string; startAt: Date; endAt: Date; notes?: string; branchId: string }) {
    // 檢查時間衝突：同一個 serviceId，時間區間重疊的預約狀態為 PENDING 或 CONFIRMED
    if (input.serviceId) {
      const conflict = await this.prisma.appointment.findFirst({
        where: {
          serviceId: input.serviceId,
          status: { in: ["PENDING", "CONFIRMED"] },
          OR: [
            {
              startAt: { lte: input.endAt },
              endAt: { gte: input.startAt },
            },
          ],
        },
      });

      if (conflict) {
        throw new BadRequestException("該時段已有預約，請選擇其他時間");
      }
    }

    return this.prisma.appointment.create({ 
      data: {
        ...input,
        status: "PENDING",
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        artist: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async myAppointments(userId: string) {
    return this.prisma.appointment.findMany({ 
      where: { userId }, 
      orderBy: { startAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        artist: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        artist: { select: { id: true, name: true, email: true } },
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
        artist: { select: { id: true, name: true, email: true } },
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
        artist: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  // 管理員專用：更新預約狀態
  async updateStatus(id: string, status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED') {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
        artist: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
      },
    });
  }
}



