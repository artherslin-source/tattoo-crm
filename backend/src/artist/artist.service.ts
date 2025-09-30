import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

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
    const notifications = await this.getNotifications(artistId);

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
  async getNotifications(artistId: string) {
    return this.prisma.notification.findMany({
      where: {
        userId: artistId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async markNotificationAsRead(notificationId: string, artistId: string) {
    // 驗證通知是否屬於該刺青師
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: artistId,
      },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在或您沒有權限修改此通知');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }
}
