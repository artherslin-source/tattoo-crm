import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache.service';

@Injectable()
export class AdminAnalyticsOptimizedService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async getAnalytics(branchId?: string, dateRange: string = '30d') {
    // 使用快取
    const cacheKey = `analytics:${branchId || 'all'}:${dateRange}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchAnalyticsData(branchId, dateRange),
      3 * 60 * 1000, // 3分鐘快取
    );
  }

  private async fetchAnalyticsData(branchId?: string, dateRange: string = '30d') {
    console.time('⏱️ Analytics Total Time');
    
    // 計算日期範圍
    const now = new Date();
    const dateRangeMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
      'all': null,
    };
    const days = dateRangeMap[dateRange] || 30;
    
    const startDate = days !== null ? (() => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      return date;
    })() : null;

    const branchFilter = branchId && branchId !== 'all' ? { branchId } : {};
    const dateFilter = startDate ? { createdAt: { gte: startDate } } : {};

    console.time('⏱️ Parallel Queries');
    
    // ========== 並行查詢所有數據 ==========
    const [
      // 營收相關
      totalRevenueAgg,
      monthlyRevenueAgg,
      last7DaysRevenueAgg,
      previousRevenueAgg,
      revenueByBranch,
      ordersWithServices,
      paymentMethodStats,
      
      // 會員相關
      totalMembers,
      newMembersThisMonth,
      activeOrderMembers,
      membersByLevel,
      topSpenders,
      totalBalanceAgg,
      
      // 預約相關
      appointmentsByStatus,
      
      // 刺青師相關
      totalArtists,
      artistPerformance,
      
      // 服務相關
      totalServices,
      serviceBookings,
      serviceCompletions,
    ] = await Promise.all([
      // 總營收
      this.prisma.order.aggregate({
        where: {
          ...branchFilter,
          ...dateFilter,
          status: { in: ['PAID', 'PAID_COMPLETE', 'PARTIALLY_PAID'] },
        },
        _sum: { finalAmount: true },
      }),
      
      // 月營收
      this.prisma.order.aggregate({
        where: {
          ...branchFilter,
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
          status: { in: ['PAID', 'PAID_COMPLETE', 'PARTIALLY_PAID'] },
        },
        _sum: { finalAmount: true },
      }),
      
      // 過去7天營收
      this.prisma.order.aggregate({
        where: {
          ...branchFilter,
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          status: { in: ['PAID', 'PAID_COMPLETE', 'PARTIALLY_PAID'] },
        },
        _sum: { finalAmount: true },
      }),
      
      // 上一期營收
      startDate && days !== null
        ? this.prisma.order.aggregate({
            where: {
              ...branchFilter,
              createdAt: {
                gte: new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000),
                lt: startDate,
              },
              status: { in: ['PAID', 'PAID_COMPLETE', 'PARTIALLY_PAID'] },
            },
            _sum: { finalAmount: true },
          })
        : Promise.resolve({ _sum: { finalAmount: 0 } }),
      
      // 分店營收排行
      this.prisma.order.groupBy({
        by: ['branchId'],
        where: {
          ...dateFilter,
          status: { in: ['PAID', 'PAID_COMPLETE', 'PARTIALLY_PAID'] },
        },
        _sum: { finalAmount: true },
        orderBy: { _sum: { finalAmount: 'desc' } },
      }),
      
      // 服務項目營收（優化：只查詢需要的欄位）
      this.prisma.order.findMany({
        where: {
          ...branchFilter,
          ...dateFilter,
          status: { in: ['PAID', 'PAID_COMPLETE', 'PARTIALLY_PAID'] },
          appointment: { serviceId: { not: null } },
        },
        select: {
          finalAmount: true,
          appointment: {
            select: {
              service: { select: { id: true, name: true } },
            },
          },
        },
      }),
      
      // 付款方式統計
      this.prisma.order.groupBy({
        by: ['paymentMethod'],
        where: {
          ...branchFilter,
          ...dateFilter,
          status: { in: ['PAID', 'PAID_COMPLETE', 'PARTIALLY_PAID'] },
        },
        _sum: { finalAmount: true },
        _count: true,
      }),
      
      // 會員總數
      this.prisma.member.count(),
      
      // 本月新增會員
      this.prisma.member.count({
        where: {
          user: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        },
      }),
      
      // 活躍會員
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          status: { in: ['PAID', 'PAID_COMPLETE', 'PARTIALLY_PAID'] },
        },
        select: { memberId: true },
        distinct: ['memberId'],
      }),
      
      // 會員等級分布
      this.prisma.member.groupBy({
        by: ['membershipLevel'],
        _count: true,
      }),
      
      // 消費 TOP 10
      this.prisma.member.findMany({
        orderBy: { totalSpent: 'desc' },
        take: 10,
        select: {
          userId: true,
          totalSpent: true,
          balance: true,
          user: { select: { name: true, email: true } },
        },
      }),
      
      // 會員總儲值
      this.prisma.member.aggregate({
        _sum: { balance: true },
      }),
      
      // 預約狀態分布
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: {
          ...branchFilter,
          ...dateFilter,
        },
        _count: true,
      }),
      
      // 刺青師總數
      this.prisma.artist.count({ where: { active: true } }),
      
      // 刺青師績效
      this.prisma.completedService.groupBy({
        by: ['artistId'],
        where: {
          ...branchFilter,
          ...(startDate ? { completedAt: { gte: startDate } } : {}),
        },
        _count: true,
        _sum: { servicePrice: true },
        orderBy: { _sum: { servicePrice: 'desc' } },
        take: 10,
      }),
      
      // 服務總數
      this.prisma.service.count({ where: { isActive: true } }),
      
      // 服務預約統計
      this.prisma.appointment.groupBy({
        by: ['serviceId'],
        where: {
          ...branchFilter,
          ...dateFilter,
          serviceId: { not: null },
        },
        _count: true,
      }),
      
      // 服務完成統計
      this.prisma.completedService.groupBy({
        by: ['serviceId'],
        where: {
          ...branchFilter,
          ...(startDate ? { completedAt: { gte: startDate } } : {}),
        },
        _count: true,
        _sum: { servicePrice: true },
      }),
    ]);
    
    console.timeEnd('⏱️ Parallel Queries');
    console.time('⏱️ Data Processing');

    // ========== 數據處理 ==========
    
    // 營收數據
    const totalRevenue = totalRevenueAgg._sum.finalAmount || 0;
    const monthlyRevenue = monthlyRevenueAgg._sum.finalAmount || 0;
    const dailyRevenue = Math.round((last7DaysRevenueAgg._sum.finalAmount || 0) / 7);
    const previousRevenue = previousRevenueAgg._sum.finalAmount || 0;
    const trend = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // 分店營收（批次查詢分店名稱，避免 N+1）
    const branchIds = revenueByBranch.map((item) => item.branchId);
    const branches = branchIds.length > 0 
      ? await this.prisma.branch.findMany({
          where: { id: { in: branchIds } },
          select: { id: true, name: true },
        })
      : [];
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));
    
    const branchRevenueWithNames = revenueByBranch.map((item) => ({
      branchId: item.branchId,
      branchName: branchMap.get(item.branchId) || '未知分店',
      amount: item._sum.finalAmount || 0,
    }));

    // 服務項目營收
    const serviceRevenueMap: Record<string, { serviceId: string; serviceName: string; amount: number; count: number }> = {};
    ordersWithServices.forEach((order) => {
      if (order.appointment?.service) {
        const serviceId = order.appointment.service.id;
        if (!serviceRevenueMap[serviceId]) {
          serviceRevenueMap[serviceId] = {
            serviceId,
            serviceName: order.appointment.service.name,
            amount: 0,
            count: 0,
          };
        }
        serviceRevenueMap[serviceId].amount += order.finalAmount;
        serviceRevenueMap[serviceId].count += 1;
      }
    });
    const serviceRevenueList = Object.values(serviceRevenueMap).sort((a, b) => b.amount - a.amount);

    // 付款方式統計
    const paymentMethodList = paymentMethodStats.map((item) => ({
      method: item.paymentMethod || '未設定',
      amount: item._sum.finalAmount || 0,
      count: item._count,
    }));

    // 會員數據
    const byLevel = membersByLevel.map((item) => ({
      level: item.membershipLevel || '未設定',
      count: item._count,
    }));

    const topSpendersData = topSpenders.map((member) => ({
      userId: member.userId,
      userName: member.user.name || member.user.email,
      totalSpent: member.totalSpent,
      balance: member.balance,
    }));

    // 預約數據
    const byStatus = appointmentsByStatus.map((item) => ({
      status: item.status,
      count: item._count,
    }));

    const completedCount = appointmentsByStatus.find((s) => s.status === 'COMPLETED')?._count || 0;
    const totalAppointmentCount = appointmentsByStatus.reduce((sum, s) => sum + s._count, 0);
    const conversionRate = totalAppointmentCount > 0 ? (completedCount / totalAppointmentCount) * 100 : 0;

    // 刺青師績效（批次查詢名稱，避免 N+1）
    const artistIds = artistPerformance.map((item) => item.artistId);
    const artists = artistIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: artistIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const artistMap = new Map(artists.map((a) => [a.id, a]));
    
    const topPerformers = artistPerformance.map((item) => {
      const artist = artistMap.get(item.artistId);
      return {
        artistId: item.artistId,
        artistName: artist?.name || artist?.email || '未知',
        revenue: item._sum.servicePrice || 0,
        completedServices: item._count,
      };
    });

    // 服務項目（批次查詢名稱，避免 N+1）
    const serviceIds = serviceBookings.map((item) => item.serviceId).filter(Boolean);
    const services = serviceIds.length > 0
      ? await this.prisma.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, name: true },
        })
      : [];
    const serviceMap = new Map(services.map((s) => [s.id, s.name]));
    
    const completionMap = new Map(
      serviceCompletions.map((c) => [
        c.serviceId,
        { count: c._count, revenue: c._sum.servicePrice || 0 }
      ])
    );

    const topServices = serviceBookings.slice(0, 6).map((item) => {
      const completion = completionMap.get(item.serviceId);
      const completionRate = item._count > 0 ? ((completion?.count || 0) / item._count) * 100 : 0;
      
      return {
        serviceId: item.serviceId,
        serviceName: serviceMap.get(item.serviceId) || '未知服務',
        bookingCount: item._count,
        completionRate,
        revenue: completion?.revenue || 0,
      };
    });

    console.timeEnd('⏱️ Data Processing');
    console.timeEnd('⏱️ Analytics Total Time');
    
    // 返回完整數據
    return {
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue,
        daily: dailyRevenue,
        trend,
        byBranch: branchRevenueWithNames,
        byService: serviceRevenueList,
        byPaymentMethod: paymentMethodList,
      },
      members: {
        total: totalMembers,
        newThisMonth: newMembersThisMonth,
        activeMembers: activeOrderMembers.length,
        byLevel,
        topSpenders: topSpendersData,
        totalBalance: totalBalanceAgg._sum.balance || 0,
      },
      appointments: {
        total: totalAppointmentCount,
        pending: appointmentsByStatus.find((s) => s.status === 'PENDING')?._count || 0,
        confirmed: appointmentsByStatus.find((s) => s.status === 'CONFIRMED')?._count || 0,
        completed: completedCount,
        cancelled: appointmentsByStatus.find((s) => s.status === 'CANCELED')?._count || 0,
        conversionRate,
        byStatus,
        byTimeSlot: [],
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
