import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { 
    search?: string; 
    status?: string; 
    startDate?: string; 
    endDate?: string;
    branchId?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
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

    if (filters?.branchId) {
      where.branchId = filters.branchId;
      console.log('🔍 Branch filter applied:', filters.branchId);
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

    let orderBy: any[] = [];
    
    console.log('🔍 Appointment filters:', filters);
    console.log('🔍 Where conditions:', JSON.stringify(where, null, 2));
    console.log('🔍 Appointment sort filters:', { sortField: filters?.sortField, sortOrder: filters?.sortOrder });
    
    if (filters?.sortField && filters?.sortOrder) {
      switch (filters.sortField) {
        case 'customerName':
          orderBy.push({ user: { name: filters.sortOrder } });
          break;
        case 'customerEmail':
          orderBy.push({ user: { email: filters.sortOrder } });
          break;
        case 'branch':
          orderBy.push({ branch: { name: filters.sortOrder } });
          break;
        case 'service':
          orderBy.push({ service: { name: filters.sortOrder } });
          break;
        case 'artist':
          orderBy.push({ artist: { name: filters.sortOrder } });
          break;
        case 'startAt':
          orderBy.push({ startAt: filters.sortOrder });
          break;
        case 'status':
          orderBy.push({ status: filters.sortOrder });
          break;
        case 'createdAt':
          orderBy.push({ createdAt: filters.sortOrder });
          break;
        default:
          orderBy.push({ startAt: 'desc' });
      }
    } else {
      orderBy.push({ startAt: 'desc' });
    }
    
    orderBy.push({ id: 'desc' });

    console.log('🔍 Final appointment orderBy:', JSON.stringify(orderBy, null, 2));

    return this.prisma.appointment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        order: { select: { id: true, totalAmount: true, finalAmount: true, status: true, paymentType: true } },
      },
      orderBy,
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
        order: { select: { id: true, totalAmount: true, finalAmount: true, status: true, paymentType: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    return appointment;
  }

  async create(input: { 
    startAt: Date; 
    endAt: Date; 
    userId: string; 
    serviceId: string; 
    artistId: string; 
    branchId: string; 
    notes?: string; 
  }) {
    // 驗證所有外鍵是否存在
    const [user, service, artist, branch] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: input.userId } }),
      this.prisma.service.findUnique({ where: { id: input.serviceId } }),
      this.prisma.user.findUnique({ where: { id: input.artistId } }),
      this.prisma.branch.findUnique({ where: { id: input.branchId } }),
    ]);

    if (!user) {
      throw new BadRequestException("用戶不存在");
    }
    if (!service) {
      throw new BadRequestException("服務項目不存在");
    }
    if (!artist) {
      throw new BadRequestException("刺青師不存在");
    }
    if (!branch) {
      throw new BadRequestException("分店不存在");
    }

    // 檢查時間衝突：同一個 artistId，時間區間重疊的預約狀態為 PENDING 或 CONFIRMED
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        artistId: input.artistId,
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
      throw new BadRequestException("該刺青師在該時段已有預約，請選擇其他時間");
    }

    return this.prisma.appointment.create({ 
      data: {
        ...input,
        status: "PENDING",
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        artist: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async updateStatus(id: string, status: string) {
    if (!['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'].includes(status)) {
      throw new BadRequestException('無效的狀態');
    }

    const appointment = await this.prisma.appointment.findUnique({ 
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        order: true
      }
    });
    
    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    // 使用事務來確保預約狀態更新和訂單創建的原子性
    return await this.prisma.$transaction(async (tx) => {
      // 更新預約狀態
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: { status: status as any },
        include: {
          user: { select: { id: true, name: true, email: true } },
          service: { select: { id: true, name: true, price: true, durationMin: true } },
          artist: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          order: true
        },
      });

      // 如果狀態變為 COMPLETED 且還沒有關聯的訂單，則自動創建訂單
      if (status === 'COMPLETED' && !appointment.order && appointment.service) {
        console.log('🎯 預約完成，自動創建訂單:', {
          appointmentId: id,
          memberId: appointment.userId,
          branchId: appointment.branchId,
          servicePrice: appointment.service.price
        });

        const order = await tx.order.create({
          data: {
            memberId: appointment.userId,
            branchId: appointment.branchId,
            appointmentId: id,
            totalAmount: appointment.service.price,
            finalAmount: appointment.service.price,
            paymentType: 'ONE_TIME',
            status: 'PENDING',
            notes: `自動生成訂單 - 預約ID: ${id}`
          }
        });

        // 更新預約的 orderId
        await tx.appointment.update({
          where: { id },
          data: { orderId: order.id }
        });

        console.log('✅ 訂單創建成功:', {
          orderId: order.id,
          appointmentId: id,
          amount: order.finalAmount
        });
      }

      return updatedAppointment;
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
