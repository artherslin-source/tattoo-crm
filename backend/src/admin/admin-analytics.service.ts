import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(branchId?: string, dateRange: string = '30d') {
    // 計算日期範圍
    const now = new Date();
    const dateRangeMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    const days = dateRangeMap[dateRange] || 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    // 構建分店過濾條件
    const branchFilter = branchId && branchId !== 'all' ? { branchId } : {};

    // ========== 營收數據 ==========
    const orders = await this.prisma.order.findMany({
      where: {
        ...branchFilter,
        createdAt: { gte: startDate },
        status: { in: ['PAID', 'PAID_COMPLETE', 'PARTIALLY_PAID'] },
      },
      include: {
        branch: true,
        appointment: {
          include: {
            service: true,
          },
        },
      },
    });

    // 計算總營收
    const totalRevenue = orders.reduce((sum, order) => sum + order.finalAmount, 0);

    // 計算月營收
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = orders
      .filter((order) => order.createdAt >= monthStart)
      .reduce((sum, order) => sum + order.finalAmount, 0);

    // 計算日均營收（過去7天）
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);
    const last7DaysRevenue = orders
      .filter((order) => order.createdAt >= last7Days)
      .reduce((sum, order) => sum + order.finalAmount, 0);
    const dailyRevenue = Math.round(last7DaysRevenue / 7);

    // 計算趨勢（與上一期對比）
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);
    const previousOrders = await this.prisma.order.findMany({
      where: {
        ...branchFilter,
        createdAt: { gte: previousPeriodStart, lt: startDate },
        status: { in: ['PAID', 'PAID_COMPLETE', 'PARTIALLY_PAID'] },
      },
    });
    const previousRevenue = previousOrders.reduce((sum, order) => sum + order.finalAmount, 0);
    const trend = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // 分店營收排行
    const revenueByBranch = await this.prisma.order.groupBy({
      by: ['branchId'],
      where: {
        createdAt: { gte: startDate },
        status: { in: ['PAID', 'PAID_COMPLETE', 'PARTIALLY_PAID'] },
      },
      _sum: {
        finalAmount: true,
      },
      orderBy: {
        _sum: {
          finalAmount: 'desc',
        },
      },
    });

    const branchRevenueWithNames = await Promise.all(
      revenueByBranch.map(async (item) => {
        const branch = await this.prisma.branch.findUnique({
          where: { id: item.branchId },
        });
        return {
          branchId: item.branchId,
          branchName: branch?.name || '未知分店',
          amount: item._sum.finalAmount || 0,
        };
      }),
    );

    // 服務項目營收
    const serviceRevenue: Record<string, { serviceId: string; serviceName: string; amount: number; count: number }> = {};
    orders.forEach((order) => {
      if (order.appointment?.service) {
        const serviceId = order.appointment.service.id;
        if (!serviceRevenue[serviceId]) {
          serviceRevenue[serviceId] = {
            serviceId,
            serviceName: order.appointment.service.name,
            amount: 0,
            count: 0,
          };
        }
        serviceRevenue[serviceId].amount += order.finalAmount;
        serviceRevenue[serviceId].count += 1;
      }
    });
    const revenueByService = Object.values(serviceRevenue).sort((a, b) => b.amount - a.amount);

    // 付款方式統計
    const paymentMethods: Record<string, { method: string; amount: number; count: number }> = {};
    orders.forEach((order) => {
      const method = order.paymentMethod || '未設定';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { method, amount: 0, count: 0 };
      }
      paymentMethods[method].amount += order.finalAmount;
      paymentMethods[method].count += 1;
    });
    const revenueByPaymentMethod = Object.values(paymentMethods);

    // ========== 會員數據 ==========
    const totalMembers = await this.prisma.member.count();

    const newMembersThisMonth = await this.prisma.member.count({
      where: {
        user: {
          createdAt: { gte: monthStart },
        },
      },
    });

    // 活躍會員（近30天有消費）
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 30);
    const activeOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: last30Days },
        status: { in: ['PAID', 'PAID_COMPLETE', 'PARTIALLY_PAID'] },
      },
      select: { memberId: true },
      distinct: ['memberId'],
    });
    const activeMembers = activeOrders.length;

    // 會員等級分布
    const membersByLevel = await this.prisma.member.groupBy({
      by: ['membershipLevel'],
      _count: true,
    });
    const byLevel = membersByLevel.map((item) => ({
      level: item.membershipLevel || '未設定',
      count: item._count,
    }));

    // 消費 TOP 10
    const topSpenders = await this.prisma.member.findMany({
      orderBy: { totalSpent: 'desc' },
      take: 10,
      include: {
        user: true,
      },
    });
    const topSpendersData = topSpenders.map((member) => ({
      userId: member.userId,
      userName: member.user.name || member.user.email,
      totalSpent: member.totalSpent,
      balance: member.balance,
    }));

    // 會員總儲值
    const memberBalances = await this.prisma.member.aggregate({
      _sum: {
        balance: true,
      },
    });
    const totalBalance = memberBalances._sum.balance || 0;

    // ========== 預約數據 ==========
    const appointments = await this.prisma.appointment.findMany({
      where: {
        ...branchFilter,
        createdAt: { gte: startDate },
      },
    });

    const appointmentsByStatus = await this.prisma.appointment.groupBy({
      by: ['status'],
      where: {
        ...branchFilter,
        createdAt: { gte: startDate },
      },
      _count: true,
    });
    const byStatus = appointmentsByStatus.map((item) => ({
      status: item.status,
      count: item._count,
    }));

    const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
    const conversionRate = appointments.length > 0 ? (completedCount / appointments.length) * 100 : 0;

    // ========== 刺青師績效 ==========
    const totalArtists = await this.prisma.artist.count({
      where: { active: true },
    });

    const artistPerformance = await this.prisma.completedService.groupBy({
      by: ['artistId'],
      where: {
        ...branchFilter,
        completedAt: { gte: startDate },
      },
      _count: true,
      _sum: {
        servicePrice: true,
      },
      orderBy: {
        _sum: {
          servicePrice: 'desc',
        },
      },
      take: 10,
    });

    const topPerformers = await Promise.all(
      artistPerformance.map(async (item) => {
        const user = await this.prisma.user.findUnique({
          where: { id: item.artistId },
        });
        return {
          artistId: item.artistId,
          artistName: user?.name || user?.email || '未知',
          revenue: item._sum.servicePrice || 0,
          completedServices: item._count,
        };
      }),
    );

    // ========== 服務項目分析 ==========
    const totalServices = await this.prisma.service.count({
      where: { isActive: true },
    });

    const serviceBookings = await this.prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        ...branchFilter,
        createdAt: { gte: startDate },
        serviceId: { not: null },
      },
      _count: true,
    });

    const serviceCompletions = await this.prisma.completedService.groupBy({
      by: ['serviceId'],
      where: {
        ...branchFilter,
        completedAt: { gte: startDate },
      },
      _count: true,
      _sum: {
        servicePrice: true,
      },
    });

    const topServices = await Promise.all(
      serviceBookings.slice(0, 6).map(async (item) => {
        const service = await this.prisma.service.findUnique({
          where: { id: item.serviceId },
        });
        const completions = serviceCompletions.find((c) => c.serviceId === item.serviceId);
        const completionRate = item._count > 0 ? ((completions?._count || 0) / item._count) * 100 : 0;

        return {
          serviceId: item.serviceId,
          serviceName: service?.name || '未知服務',
          bookingCount: item._count,
          completionRate,
          revenue: completions?._sum.servicePrice || 0,
        };
      }),
    );

    // 返回完整數據
    return {
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue,
        daily: dailyRevenue,
        trend,
        byBranch: branchRevenueWithNames,
        byService: revenueByService,
        byPaymentMethod: revenueByPaymentMethod,
      },
      members: {
        total: totalMembers,
        newThisMonth: newMembersThisMonth,
        activeMembers,
        byLevel,
        topSpenders: topSpendersData,
        totalBalance,
      },
      appointments: {
        total: appointments.length,
        pending: appointments.filter((a) => a.status === 'PENDING').length,
        confirmed: appointments.filter((a) => a.status === 'CONFIRMED').length,
        completed: completedCount,
        cancelled: appointments.filter((a) => a.status === 'CANCELED').length,
        conversionRate,
        byStatus,
        byTimeSlot: [], // 可以後續實現時段分析
      },
      artists: {
        total: totalArtists,
        topPerformers,
      },
      services: {
        total: totalServices,
        topServices,
      },
    };
  }
}

