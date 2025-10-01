import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { search?: string; status?: string; startDate?: string; endDate?: string }) {
    const where: any = {};

    if (filters?.search) {
      where.user = {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.startAt = {};
      if (filters.startDate) {
        where.startAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.startAt.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: [
        { branch: { name: 'asc' } },
        { startAt: 'desc' }
      ],
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, name: true, description: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    return appointment;
  }

  async updateStatus(id: string, status: string) {
    if (!['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED'].includes(status)) {
      throw new BadRequestException('無效的狀態');
    }

    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: status as any },
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, data: { startAt?: Date; endAt?: Date; notes?: string; artistId?: string }) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    // 如果修改時間，檢查衝突
    if (data.startAt || data.endAt) {
      const startAt = data.startAt || appointment.startAt;
      const endAt = data.endAt || appointment.endAt;

      const conflict = await this.prisma.appointment.findFirst({
        where: {
          id: { not: id },
          serviceId: appointment.serviceId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          OR: [
            {
              startAt: { lte: endAt },
              endAt: { gte: startAt },
            },
          ],
        },
      });

      if (conflict) {
        throw new BadRequestException('該時段已有其他預約');
      }
    }

    return this.prisma.appointment.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    await this.prisma.appointment.delete({ where: { id } });
    return { message: '預約已刪除' };
  }
}
