import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: { userId: string; artistId?: string; serviceId?: string; startAt: Date; endAt: Date; notes?: string; branchId: string; contactId?: string }) {
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
        user: { select: { id: true, name: true, email: true } },
        artist: true,
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
      },
    });
  }

  // 管理員專用：更新預約狀態
  async updateStatus(id: string, status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED') {
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({ 
        where: { id },
        include: {
          service: { select: { id: true, name: true, price: true } },
          user: { select: { id: true, name: true, email: true } },
          artist: true,
        }
      });
      
      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      // 如果預約狀態變為 COMPLETED 且還沒有關聯的訂單，自動生成訂單
      let orderId: string | null = null;
      if (status === 'COMPLETED' && !appointment.orderId && appointment.serviceId) {
        try {
          // 確保用戶有 Member 記錄
          const member = await tx.member.findUnique({
            where: { userId: appointment.userId },
          });

          if (!member) {
            await tx.member.create({
              data: {
                userId: appointment.userId,
                totalSpent: 0,
                balance: 0,
                membershipLevel: 'BRONZE',
              },
            });
          }

          // 獲取服務價格信息
          const service = await tx.service.findUnique({
            where: { id: appointment.serviceId },
            select: { price: true, name: true }
          });

          if (!service) {
            throw new Error('Service not found');
          }

          // 直接在事務中創建訂單
          const order = await tx.order.create({
            data: {
              memberId: appointment.userId,
              branchId: appointment.branchId,
              appointmentId: appointment.id,
              totalAmount: service.price,
              finalAmount: service.price,
              status: 'PENDING_PAYMENT',
              paymentType: 'ONE_TIME',
              isInstallment: false,
            },
          });

          orderId = order.id;

          console.log('🎯 預約完成，自動生成訂單:', {
            appointmentId: appointment.id,
            orderId: order.id,
            totalAmount: service.price,
            serviceName: service.name
          });
        } catch (error) {
          console.error('❌ 自動生成訂單失敗:', error);
          // 不拋出錯誤，避免影響預約狀態更新
        }
      }

      // 更新預約狀態和 orderId
      const updateData: { status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED'; orderId?: string } = { status: status as 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' };
      if (orderId) {
        updateData.orderId = orderId;
      }

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



