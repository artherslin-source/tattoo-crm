import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { getAllArtistUserIdsForLogin, resolveTargetArtistUserIdForBranch } from "../common/access/artist-scope";
import type { AccessActor } from "../common/access/access.types";

@Injectable()
export class ArtistService {
  constructor(private prisma: PrismaService) {}

  // 1. 首頁 Dashboard
  async getDashboard(artistId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // 今日行程
    const todayAppointments = await this.prisma.appointment.findMany({
      where: {
        artistId,
        startAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            durationMin: true,
            price: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    // Debug log
    console.log('DEBUG todayAppointments[0].service:', JSON.stringify(todayAppointments[0]?.service, null, 2));

    // 最新通知（模擬數據，實際應該從 Notification 表獲取）
    const notificationUserIds = await getAllArtistUserIdsForLogin(this.prisma, artistId);
    const notifications = await this.prisma.notification.findMany({
      where: { userId: { in: notificationUserIds } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      todayAppointments,
      notifications: notifications.slice(0, 3), // 只返回最新 3 筆
      stats: {
        todayAppointmentsCount: todayAppointments.length,
        unreadNotificationsCount: notifications.filter(n => !n.isRead).length,
      },
    };
  }

  // 2. 我的行程
  async getMyAppointments(artistId: string, period?: 'today' | 'week' | 'month') {
    console.log('getMyAppointments called with period:', period);
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 預設顯示未來 30 天
    }

    console.log('Date range:', { startDate, endDate, period });

    const appointments = await this.prisma.appointment.findMany({
      where: {
        artistId,
        startAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMin: true,
            price: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    return appointments;
  }

  async getAppointmentsByRange(artistId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        artistId,
        startAt: {
          gte: start,
          lt: end,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMin: true,
            price: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    return appointments;
  }

  private clampEndToSameDay(startAt: Date, endAt: Date): Date {
    const dayEnd = new Date(startAt);
    dayEnd.setHours(23, 59, 59, 999);
    return endAt > dayEnd ? dayEnd : endAt;
  }

  async moveIntentDate(input: {
    artistId: string;
    appointmentId: string;
    preferredDate: string; // YYYY-MM-DD
    holdMin?: number;
    reason?: string;
  }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.preferredDate)) {
      throw new BadRequestException('preferredDate must be YYYY-MM-DD');
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: input.appointmentId,
        artistId: input.artistId,
        status: 'INTENT' as any,
      },
      select: { id: true, holdMin: true, startAt: true, endAt: true },
    });

    if (!appointment) {
      throw new NotFoundException('預約不存在或無權限操作');
    }

    const nextHoldMin = input.holdMin ?? appointment.holdMin ?? 150;
    if (!Number.isInteger(nextHoldMin) || nextHoldMin <= 0) {
      throw new BadRequestException('保留時間必須為正整數（分鐘）');
    }
    if (nextHoldMin > 24 * 60) {
      throw new BadRequestException('保留時間不可超過 24 小時');
    }

    const startAt = new Date(`${input.preferredDate}T00:00:00`);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('preferredDate invalid');
    }
    const computedEndAt = this.clampEndToSameDay(startAt, new Date(startAt.getTime() + nextHoldMin * 60 * 1000));

    return this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        startAt,
        endAt: computedEndAt,
        holdMin: nextHoldMin,
        holdUpdatedAt: new Date(),
        holdUpdatedBy: input.artistId,
        holdUpdateReason: input.reason ?? null,
      },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        service: { select: { id: true, name: true, description: true, durationMin: true, price: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  // 客戶標註相關方法
  async getCustomerNotes(artistId: string, customerId: string) {
    return this.prisma.customerNote.findMany({
      where: {
        customerId,
        createdBy: artistId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createCustomerNote(artistId: string, customerId: string, content: string) {
    return this.prisma.customerNote.create({
      data: {
        content,
        customerId,
        createdBy: artistId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteCustomerNote(artistId: string, noteId: string) {
    // 確保只有創建者可以刪除
    const note = await this.prisma.customerNote.findFirst({
      where: {
        id: noteId,
        createdBy: artistId,
      },
    });

    if (!note) {
      throw new Error('標註不存在或您沒有權限刪除此標註');
    }

    return this.prisma.customerNote.delete({
      where: { id: noteId },
    });
  }

  // 客戶提醒相關方法
  async getCustomerReminders(artistId: string, customerId: string) {
    return this.prisma.customerReminder.findMany({
      where: {
        customerId,
        createdBy: artistId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async createCustomerReminder(artistId: string, customerId: string, data: { title: string; date: string; note?: string }) {
    return this.prisma.customerReminder.create({
      data: {
        title: data.title,
        date: new Date(data.date),
        note: data.note,
        customerId,
        createdBy: artistId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteCustomerReminder(artistId: string, reminderId: string) {
    // 確保只有創建者可以刪除
    const reminder = await this.prisma.customerReminder.findFirst({
      where: {
        id: reminderId,
        createdBy: artistId,
      },
    });

    if (!reminder) {
      throw new Error('提醒不存在或您沒有權限刪除此提醒');
    }

    return this.prisma.customerReminder.delete({
      where: { id: reminderId },
    });
  }

  async updateAppointmentStatus(
    appointmentId: string,
    status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED',
    artistId: string
  ) {
    // 檢查預約是否屬於該刺青師
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        artistId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            durationMin: true,
            price: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        completedService: true, // 檢查是否已經有完成紀錄
      },
    });

    if (!appointment) {
      throw new NotFoundException('預約不存在或您沒有權限修改此預約');
    }

    // 防呆設計：如果已經是完成狀態，檢查是否重複操作
    if (status === 'COMPLETED' && appointment.status === 'COMPLETED') {
      if (appointment.completedService) {
        throw new Error('此服務已完成，無法重複操作');
      }
    }

    // 使用事務來確保數據一致性
    return this.prisma.$transaction(async (tx) => {
      // 更新預約狀態
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              durationMin: true,
              price: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 如果是完成服務，創建服務完成紀錄
      if (status === 'COMPLETED' && !appointment.completedService) {
        await tx.completedService.create({
          data: {
            appointmentId: appointment.id,
            customerId: appointment.userId,
            artistId: appointment.artistId!,
            serviceId: appointment.serviceId!,
            branchId: appointment.branchId,
            serviceName: appointment.service!.name,
            servicePrice: appointment.service!.price,
            serviceDuration: appointment.service!.durationMin,
            notes: appointment.notes,
          },
        });

        // 更新會員的累計消費
        await tx.member.updateMany({
          where: { userId: appointment.userId },
          data: {
            totalSpent: {
              increment: appointment.service!.price,
            },
          },
        });
      }

      return updatedAppointment;
    });
  }

  // 3. 顧客資訊
  async getMyCustomers(artistId: string) {
    // 獲取所有曾經服務過的顧客（從 CompletedService 表）
    const completedServices = await this.prisma.completedService.findMany({
      where: {
        artistId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      distinct: ['customerId'],
    });

    // 為每個顧客添加統計資訊
    const customersWithStats = await Promise.all(
      completedServices.map(async (completedService) => {
        const customerId = completedService.customerId;
        
        const [lastService, serviceCount, totalSpent, allCompletedServices] = await Promise.all([
          this.prisma.completedService.findFirst({
            where: {
              artistId,
              customerId,
            },
            orderBy: {
              completedAt: 'desc',
            },
          }),
          this.prisma.completedService.count({
            where: {
              artistId,
              customerId,
            },
          }),
          this.prisma.completedService.aggregate({
            where: {
              artistId,
              customerId,
            },
            _sum: {
              servicePrice: true,
            },
          }),
          this.prisma.completedService.findMany({
            where: {
              artistId,
              customerId,
            },
            orderBy: {
              completedAt: 'desc',
            },
            take: 5, // 最近5次服務
          }),
        ]);

        return {
          id: completedService.customer.id,
          name: completedService.customer.name,
          phone: completedService.customer.phone,
          email: completedService.customer.email,
          totalAppointments: serviceCount,
          totalSpent: totalSpent._sum.servicePrice || 0,
          lastVisit: lastService?.completedAt || null,
          appointments: allCompletedServices.map(service => ({
            id: service.id,
            startAt: service.completedAt,
            status: 'COMPLETED',
            service: {
              name: service.serviceName,
              price: service.servicePrice,
            },
            notes: service.notes,
          })),
        };
      })
    );

    return customersWithStats;
  }

  async getCustomerDetails(customerId: string, artistId: string) {
    // 檢查該顧客是否曾經被此刺青師服務過
    const hasServiceHistory = await this.prisma.appointment.findFirst({
      where: {
        artistId,
        userId: customerId,
      },
    });

    if (!hasServiceHistory) {
      throw new ForbiddenException('您沒有權限查看此顧客的資訊');
    }

    // 獲取顧客基本資料
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        birthday: true,
        gender: true,
        stylePreferences: true,
        createdAt: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('顧客不存在');
    }

    // 獲取過往刺青紀錄
    const serviceHistory = await this.prisma.appointment.findMany({
      where: {
        artistId,
        userId: customerId,
        status: 'COMPLETED',
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
          },
        },
      },
      orderBy: {
        startAt: 'desc',
      },
    });

    return {
      ...customer,
      serviceHistory,
    };
  }

  // 4. 作品管理
  async getPortfolio(artistId: string) {
    return this.prisma.portfolioItem.findMany({
      where: { artistId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async addPortfolioItem(artistId: string, data: {
    title: string;
    description?: string;
    imageUrl: string;
    tags: string[];
  }) {
    return this.prisma.portfolioItem.create({
      data: {
        ...data,
        artistId,
      },
    });
  }

  async updatePortfolioItem(portfolioId: string, data: any, artistId: string) {
    // 驗證作品是否屬於該刺青師
    const item = await this.prisma.portfolioItem.findFirst({
      where: {
        id: portfolioId,
        artistId,
      },
    });

    if (!item) {
      throw new NotFoundException('作品不存在或您沒有權限修改此作品');
    }

    return this.prisma.portfolioItem.update({
      where: { id: portfolioId },
      data,
    });
  }

  async deletePortfolioItem(portfolioId: string, artistId: string) {
    // 驗證作品是否屬於該刺青師
    const item = await this.prisma.portfolioItem.findFirst({
      where: {
        id: portfolioId,
        artistId,
      },
    });

    if (!item) {
      throw new NotFoundException('作品不存在或您沒有權限刪除此作品');
    }

    return this.prisma.portfolioItem.delete({
      where: { id: portfolioId },
    });
  }

  // 5. 通知系統
  async getNotifications(actor: AccessActor, branchId?: string) {
    const ids = branchId && branchId !== 'all'
      ? [await resolveTargetArtistUserIdForBranch(this.prisma, actor, branchId)]
      : await getAllArtistUserIdsForLogin(this.prisma, actor.id);
    return this.prisma.notification.findMany({
      where: {
        userId: { in: ids },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async markNotificationAsRead(notificationId: string, artistId: string) {
    const ids = await getAllArtistUserIdsForLogin(this.prisma, artistId);
    // 驗證通知是否屬於該刺青師（含連結身分）
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: { in: ids },
      },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在或您沒有權限修改此通知');
    }

    const existingData =
      notification.data && typeof notification.data === 'object'
        ? (notification.data as Record<string, unknown>)
        : {};

    // Ensure we only stamp readAt once.
    const nextData =
      notification.isRead && typeof (existingData as any).readAt === 'string'
        ? existingData
        : { ...existingData, readAt: new Date().toISOString() };

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        data: nextData as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
