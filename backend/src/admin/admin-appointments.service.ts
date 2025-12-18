import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isBoss, type AccessActor } from '../common/access/access.types';
import type { Prisma } from '@prisma/client';

@Injectable()
export class AdminAppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildScopeWhere(actor: AccessActor): Prisma.AppointmentWhereInput {
    if (isBoss(actor)) return {};
    return {
      AND: [
        { branchId: actor.branchId ?? undefined },
        {
          OR: [
            { artistId: actor.id },
            { user: { primaryArtistId: actor.id } },
          ],
        },
      ],
    };
  }

  async findAll(filters: { 
    actor: AccessActor;
    search?: string; 
    status?: string; 
    startDate?: string; 
    endDate?: string;
    branchId?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: any = {
      ...this.buildScopeWhere(filters.actor),
    };

    if (filters?.search) {
      where.AND = where.AND ?? [];
      where.AND.push({
        user: {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    // Branch filter: only BOSS can choose arbitrary branches; ARTIST is forced to own branch.
    if (filters?.branchId && isBoss(filters.actor)) {
      where.AND = where.AND ?? [];
      where.AND.push({ branchId: filters.branchId });
      console.log('🔍 Branch filter applied (BOSS):', filters.branchId);
    }

    if (filters?.startDate || filters?.endDate) {
      where.startAt = where.startAt ?? {};
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
        user: { select: { id: true, name: true, email: true, phone: true, primaryArtistId: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        order: { select: { id: true, totalAmount: true, finalAmount: true, status: true, paymentType: true } },
      },
      orderBy,
    });
  }

  async findOne(input: { actor: AccessActor; id: string }) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: input.id, ...this.buildScopeWhere(input.actor) },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, primaryArtistId: true } },
        service: { select: { id: true, name: true, description: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        order: { select: { id: true, totalAmount: true, finalAmount: true, status: true, paymentType: true, installments: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    // Attach customer notes + history services with hybrid scoping rules:
    // - Primary owner (or BOSS): can see all notes/history of that customer in the shop
    // - Exception appointment (appointment.artistId === actor.id): can see own notes + own completed services
    const isPrimaryOwner =
      isBoss(input.actor) || (appointment.user?.primaryArtistId && appointment.user.primaryArtistId === input.actor.id);

    const [customerNotes, historyServices] = await Promise.all([
      this.prisma.customerNote.findMany({
        where: {
          customerId: appointment.userId,
          ...(isPrimaryOwner ? {} : { createdBy: input.actor.id }),
        },
        include: {
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.completedService.findMany({
        where: {
          customerId: appointment.userId,
          ...(isPrimaryOwner ? {} : { artistId: input.actor.id }),
        },
        select: {
          id: true,
          serviceName: true,
          servicePrice: true,
          completedAt: true,
          branchId: true,
          artistId: true,
        },
        orderBy: { completedAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      ...appointment,
      customerNotes,
      historyServices,
    };
  }

  async create(input: { 
    actor: AccessActor;
    startAt: Date; 
    endAt: Date; 
    userId: string; 
    serviceId: string; 
    artistId: string; 
    branchId: string; 
    notes?: string;
    contactId?: string;
  }) {
    try {
      // Scope validation for ARTIST
      if (!isBoss(input.actor)) {
        if (input.branchId !== input.actor.branchId) {
          throw new ForbiddenException('Cannot create appointment outside your branch');
        }
        // ARTIST can only create appointments assigned to themselves (future staff roles can broaden this).
        if (input.artistId !== input.actor.id) {
          throw new ForbiddenException('Cannot assign appointment to another artist');
        }
      }

      console.log('🔍 開始驗證外鍵:', {
        userId: input.userId,
        serviceId: input.serviceId,
        artistId: input.artistId,
        branchId: input.branchId
      });

      // 驗證所有外鍵是否存在
      const [user, service, artist, branch] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: input.userId } }),
        this.prisma.service.findUnique({ where: { id: input.serviceId } }),
        this.prisma.user.findUnique({ where: { id: input.artistId } }), // 修正：artistId 實際上是 User 表的 ID
        this.prisma.branch.findUnique({ where: { id: input.branchId } }),
      ]);

      console.log('🔍 外鍵驗證結果:', {
        user: user ? '存在' : '不存在',
        service: service ? '存在' : '不存在',
        artist: artist ? '存在' : '不存在',
        branch: branch ? '存在' : '不存在'
      });

      if (!user) {
        throw new BadRequestException("用戶不存在");
      }
      if (!isBoss(input.actor)) {
        // Hybrid ownership model: manual assignment of primary artist.
        // If customer isn't assigned yet, allow ARTIST to assign when creating the first appointment.
        if (!user.primaryArtistId) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { primaryArtistId: input.actor.id, branchId: input.actor.branchId ?? user.branchId },
          });
        } else if (user.primaryArtistId !== input.actor.id) {
          throw new ForbiddenException('Customer is not owned by this artist');
        }
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

      // 檢查時間衝突（跨分店）：同一位真人 (personId) 的所有帳號，在同時段不得重疊
      console.log('🔍 檢查時間衝突(跨店/personId):', {
        artistId: input.artistId,
        startAt: input.startAt,
        endAt: input.endAt
      });

      // 暫時跳過跨分店排程檢查（personId 欄位未啟用）
      const artistIdsToCheck: string[] = [input.artistId];

      const conflicts = await this.prisma.appointment.findMany({
        where: {
          artistId: { in: artistIdsToCheck },
          status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
          OR: [
            {
              startAt: { lte: input.endAt },
              endAt: { gte: input.startAt },
            },
          ],
        },
        include: {
          user: { select: { name: true } },
        },
      });

      console.log('🔍 衝突檢查結果:', conflicts.length, '個衝突');

      if (conflicts.length > 0) {
        const conflictInfo = conflicts.map(conflict => ({
          member: conflict.user.name,
          startTime: conflict.startAt,
          endTime: conflict.endAt,
        }));

        console.log('🚨 發現衝突，拋出 ConflictException:', conflictInfo);
        throw new ConflictException({
          message: "該時段已被預約",
          conflicts: conflictInfo,
        });
      }

      return this.prisma.appointment.create({ 
        data: {
          startAt: input.startAt,
          endAt: input.endAt,
          userId: input.userId,
          serviceId: input.serviceId,
          artistId: input.artistId,
          branchId: input.branchId,
          notes: input.notes,
          contactId: input.contactId,
          status: "PENDING",
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          artist: { select: { id: true, name: true } },
          service: { select: { id: true, name: true, price: true, durationMin: true } },
          branch: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
    } catch (error) {
      console.error('❌ CreateAppointment Error:', error);
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('創建預約失敗: ' + error.message);
    }
  }

  async updateStatus(input: { actor: AccessActor; id: string; status: string }) {
    if (!['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'].includes(input.status)) {
      throw new BadRequestException('無效的狀態');
    }

    const appointment = await this.prisma.appointment.findFirst({ 
      where: { id: input.id, ...this.buildScopeWhere(input.actor) },
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
        where: { id: input.id },
        data: { status: input.status as any },
        include: {
          user: { select: { id: true, name: true, email: true } },
          service: { select: { id: true, name: true, price: true, durationMin: true } },
          artist: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          order: true
        },
      });

      // 如果狀態變為 COMPLETED 且還沒有關聯的訂單，則自動創建訂單
      if (input.status === 'COMPLETED' && !appointment.order && appointment.service) {
        console.log('🎯 預約完成，自動創建訂單:', {
          appointmentId: input.id,
          memberId: appointment.userId,
          branchId: appointment.branchId,
          servicePrice: appointment.service.price
        });

        const order = await tx.order.create({
          data: {
            memberId: appointment.userId,
            branchId: appointment.branchId,
            appointmentId: input.id,
            totalAmount: appointment.service.price,
            finalAmount: appointment.service.price,
            paymentType: 'ONE_TIME',
            status: 'PENDING_PAYMENT',
            notes: `自動生成訂單 - 預約ID: ${input.id}`
          }
        });

        // 更新預約的 orderId
        await tx.appointment.update({
          where: { id: input.id },
          data: { orderId: order.id }
        });

        console.log('✅ 訂單創建成功:', {
          orderId: order.id,
          appointmentId: input.id,
          amount: order.finalAmount
        });
      }

      return updatedAppointment;
    });
  }

  async update(input: { actor: AccessActor; id: string; data: { startAt?: Date; endAt?: Date; notes?: string; artistId?: string } }) {
    const appointment = await this.prisma.appointment.findFirst({ where: { id: input.id, ...this.buildScopeWhere(input.actor) } });
    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    // 如果修改時間，檢查衝突
    if (input.data.startAt || input.data.endAt) {
      const startAt = input.data.startAt || appointment.startAt;
      const endAt = input.data.endAt || appointment.endAt;

      const conflict = await this.prisma.appointment.findFirst({
        where: {
          id: { not: input.id },
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
      where: { id: input.id },
      data: input.data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async remove(input: { actor: AccessActor; id: string }) {
    const appointment = await this.prisma.appointment.findFirst({ where: { id: input.id, ...this.buildScopeWhere(input.actor) } });
    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    await this.prisma.appointment.delete({ where: { id: input.id } });
    return { message: '預約已刪除' };
  }
}
