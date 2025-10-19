import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache.service';
import { DateTime } from 'luxon';

type TimeRange = { start: Date; end: Date };
type RangeKey = '7d' | '30d' | '90d' | '365d' | 'all' | 'month';

@Injectable()
export class AdminAnalyticsUnifiedService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  // 統一時間範圍解析函式
  private resolveRange(range: RangeKey, now = DateTime.now().setZone('Asia/Taipei')): TimeRange {
    if (range === 'month') {
      const start = now.startOf('month');
      const end = now.endOf('day');
      return { start: start.toJSDate(), end: end.toJSDate() };
    }
    if (range === 'all') {
      // 全部時間：從最早日期到現在
      return { start: new Date('1970-01-01T00:00:00.000Z'), end: now.endOf('day').toJSDate() };
    }
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const start = now.minus({ days: days - 1 }).startOf('day');  // 含今天，共 N 天
    const end = now.endOf('day');                              // 含今天 23:59:59
    return { start: start.toJSDate(), end: end.toJSDate() };
  }

  // 單一口徑：用 paidAt 聚合營收
  private async revenueByPaidAt(range: TimeRange, branchFilter: any = {}) {
    // 一次付清：直接用 Order.paidAt 累加 finalAmount
    const oneTime = await this.prisma.order.aggregate({
      _sum: { finalAmount: true },
      where: {
        paymentType: 'ONE_TIME',
        status: { in: ['PAID', 'PAID_COMPLETE', 'INSTALLMENT_ACTIVE', 'PARTIALLY_PAID', 'COMPLETED'] },
        paidAt: { gte: range.start, lte: range.end },
        ...branchFilter,
      },
    });

    // 分期：以 Installment.paidAt 累加實收金額
    const installments = await this.prisma.installment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'PAID',
        paidAt: { gte: range.start, lte: range.end },
        order: branchFilter,
      },
    });

    return (oneTime._sum.finalAmount || 0) + (installments._sum.amount || 0);
  }

  // 活躍會員查詢（統一使用 paidAt）
  private async getActiveMembers(range: TimeRange, branchFilter: any = {}) {
    const result = await this.prisma.$queryRawUnsafe<{ count: number }[]>(`
      SELECT COUNT(DISTINCT member_id) AS count
      FROM (
        SELECT member_id FROM "Order"
          WHERE payment_type='ONE_TIME' AND status IN ('PAID','PAID_COMPLETE','INSTALLMENT_ACTIVE','PARTIALLY_PAID','COMPLETED')
            AND paid_at BETWEEN $1 AND $2
            ${Object.keys(branchFilter).length > 0 ? 'AND branch_id = $3' : ''}
        UNION
        SELECT o.member_id FROM "Installment" i
          JOIN "Order" o ON i.order_id = o.id
          WHERE i.status='PAID' AND i.paid_at BETWEEN $1 AND $2
            ${Object.keys(branchFilter).length > 0 ? 'AND o.branch_id = $3' : ''}
      ) t
    `, 
    range.start,
    range.end,
    ...(Object.keys(branchFilter).length > 0 ? [branchFilter.branchId] : [])
    );
    
    return result[0]?.count || 0;
  }

  async getAnalytics(branchId?: string, dateRange: string = '30d') {
    // 轉換 dateRange 為 RangeKey
    const rangeKey: RangeKey = dateRange === '7d' ? '7d' : 
                              dateRange === '30d' ? '30d' : 
                              dateRange === '90d' ? '90d' : 
                              dateRange === '365d' ? '365d' : 
                              dateRange === 'all' ? 'all' : '30d';
    
    // 使用快取
    const cacheKey = `analytics:${branchId || 'all'}:${rangeKey}:${DateTime.now().setZone('Asia/Taipei').toFormat('yyyy-MM-dd')}`;
    
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 分店篩選
    const branchFilter = branchId ? { branchId } : {};
    
    // 解析時間範圍
    const currentRange = this.resolveRange(rangeKey);
    const monthRange = this.resolveRange('month');
    
    console.log('🔍 Unified Analytics query params:', {
      branchId,
      dateRange,
      rangeKey,
      currentRange,
      monthRange
    });

    const [
      // 總營收（使用統一查詢）
      totalRevenue,
      // 月營收（使用統一查詢）
      monthlyRevenue,
      // 活躍會員（近30天有消費）
      activeMembers,
      // 分店營收排行
      branchRevenueOneTime,
      branchRevenueInstallments,
      // 服務項目營收
      serviceRevenueOneTime,
      serviceRevenueInstallments,
      // 付款方式統計
      paymentMethodOneTime,
      paymentMethodInstallments,
      // 會員統計
      totalMembers,
      newMembersThisMonth,
      memberLevelDistribution,
      topSpenders,
    ] = await this.prisma.$transaction([
      // 總營收（使用統一查詢）
      this.revenueByPaidAt(currentRange, branchFilter),
      
      // 月營收（使用統一查詢）
      this.revenueByPaidAt(monthRange, branchFilter),
      
      // 活躍會員（近30天有消費）- 使用統一查詢邏輯
      this.getActiveMembers(
        {
          start: new Date(DateTime.now().setZone('Asia/Taipei').minus({ days: 30 }).startOf('day').toJSDate()),
          end: new Date(DateTime.now().setZone('Asia/Taipei').endOf('day').toJSDate())
        },
        branchFilter
      ),
      
      // 分店營收排行（一次付清）
      this.prisma.order.groupBy({
        by: ['branchId'],
        where: {
          ...branchFilter,
          paymentType: 'ONE_TIME',
          status: { in: ['PAID', 'PAID_COMPLETE', 'INSTALLMENT_ACTIVE', 'PARTIALLY_PAID', 'COMPLETED'] },
          paidAt: { gte: currentRange.start, lte: currentRange.end },
        },
        _sum: { finalAmount: true },
        orderBy: { _sum: { finalAmount: 'desc' } },
      }),
      
      // 分店營收排行（分期付款）
      this.prisma.installment.groupBy({
        by: ['orderId'],
        where: {
          status: 'PAID',
          paidAt: { gte: currentRange.start, lte: currentRange.end },
          order: branchFilter,
        },
        _sum: { amount: true },
      }),
      
      // 服務項目營收（一次付清）
      this.prisma.order.findMany({
        where: {
          ...branchFilter,
          paymentType: 'ONE_TIME',
          status: { in: ['PAID', 'PAID_COMPLETE', 'INSTALLMENT_ACTIVE', 'PARTIALLY_PAID', 'COMPLETED'] },
          paidAt: { gte: currentRange.start, lte: currentRange.end },
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
      
      // 服務項目營收（分期付款）
      this.prisma.installment.findMany({
        where: {
          status: 'PAID',
          paidAt: { gte: currentRange.start, lte: currentRange.end },
          order: {
            ...branchFilter,
            appointment: { serviceId: { not: null } },
          },
        },
        select: {
          amount: true,
          order: {
            select: {
              appointment: {
                select: {
                  service: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      
      // 付款方式統計（一次付清）
      this.prisma.order.groupBy({
        by: ['paymentMethod'],
        where: {
          ...branchFilter,
          paymentType: 'ONE_TIME',
          status: { in: ['PAID', 'PAID_COMPLETE', 'INSTALLMENT_ACTIVE', 'PARTIALLY_PAID', 'COMPLETED'] },
          paidAt: { gte: currentRange.start, lte: currentRange.end },
        },
        _sum: { finalAmount: true },
        _count: true,
      }),
      
      // 付款方式統計（分期付款）
      this.prisma.installment.groupBy({
        by: ['paymentMethod'],
        where: {
          status: 'PAID',
          paidAt: { gte: currentRange.start, lte: currentRange.end },
          order: branchFilter,
        },
        _sum: { amount: true },
        _count: true,
      }),
      
      // 會員總數
      this.prisma.member.count(),
      
      // 本月新增會員
      this.prisma.member.count({
        where: {
          user: { createdAt: { gte: monthRange.start } },
        },
      }),
      
      // 會員等級分布
      this.prisma.member.groupBy({
        by: ['level'],
        _count: true,
      }),
      
      // 消費TOP10
      this.prisma.member.findMany({
        select: {
          id: true,
          user: { select: { name: true } },
          level: true,
          orders: {
            where: {
              status: { in: ['PAID', 'PAID_COMPLETE', 'INSTALLMENT_ACTIVE', 'PARTIALLY_PAID', 'COMPLETED'] },
            },
            select: {
              finalAmount: true,
              installments: {
                where: { status: 'PAID' },
                select: { amount: true },
              },
            },
          },
        },
        orderBy: {
          orders: {
            _count: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // 計算日均營收
    let dailyRevenue: number;
    let actualDays: number | null = null;
    
    if (rangeKey === 'all') {
      // 全部時間：顯示總營收，不計算平均值
      dailyRevenue = totalRevenue;
      actualDays = null;
    } else {
      // 計算日均營收
      const days = rangeKey === '7d' ? 7 : rangeKey === '30d' ? 30 : rangeKey === '90d' ? 90 : 365;
      dailyRevenue = Math.round(totalRevenue / days);
      actualDays = days;
    }
    
    // 處理分店營收排行
    const branchRevenueMap = new Map<string, number>();
    
    // 一次付清分店營收
    branchRevenueOneTime.forEach(item => {
      const current = branchRevenueMap.get(item.branchId) || 0;
      branchRevenueMap.set(item.branchId, current + Number(item._sum.finalAmount || 0));
    });
    
    // 分期付款分店營收（需要通過 orderId 查詢分店）
    if (branchRevenueInstallments.length > 0) {
      const orderIds = branchRevenueInstallments.map(item => item.orderId);
      const orders = await this.prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, branchId: true },
      });
      
      branchRevenueInstallments.forEach(installment => {
        const order = orders.find(o => o.id === installment.orderId);
        if (order) {
          const current = branchRevenueMap.get(order.branchId) || 0;
          branchRevenueMap.set(order.branchId, current + Number(installment._sum.amount || 0));
        }
      });
    }
    
    const branchRevenue = Array.from(branchRevenueMap.entries())
      .map(([branchId, revenue]) => ({ branchId, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    // 處理服務項目營收
    const serviceRevenueMap = new Map<string, { name: string; revenue: number; count: number }>();
    
    // 一次付清服務營收
    serviceRevenueOneTime.forEach(order => {
      if (order.appointment?.service) {
        const serviceId = order.appointment.service.id;
        const serviceName = order.appointment.service.name;
        const current = serviceRevenueMap.get(serviceId) || { name: serviceName, revenue: 0, count: 0 };
        serviceRevenueMap.set(serviceId, {
          name: serviceName,
          revenue: current.revenue + Number(order.finalAmount || 0),
          count: current.count + 1,
        });
      }
    });
    
    // 分期付款服務營收
    serviceRevenueInstallments.forEach(installment => {
      if (installment.order?.appointment?.service) {
        const serviceId = installment.order.appointment.service.id;
        const serviceName = installment.order.appointment.service.name;
        const current = serviceRevenueMap.get(serviceId) || { name: serviceName, revenue: 0, count: 0 };
        serviceRevenueMap.set(serviceId, {
          name: serviceName,
          revenue: current.revenue + Number(installment.amount || 0),
          count: current.count + 1,
        });
      }
    });
    
    const serviceRevenue = Array.from(serviceRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    // 處理付款方式統計
    const paymentMethodMap = new Map<string, { amount: number; count: number }>();
    
    // 一次付清付款方式
    paymentMethodOneTime.forEach(item => {
      const method = item.paymentMethod || 'UNKNOWN';
      const current = paymentMethodMap.get(method) || { amount: 0, count: 0 };
      paymentMethodMap.set(method, {
        amount: current.amount + Number(item._sum.finalAmount || 0),
        count: current.count + item._count,
      });
    });
    
    // 分期付款付款方式
    paymentMethodInstallments.forEach(item => {
      const method = item.paymentMethod || 'UNKNOWN';
      const current = paymentMethodMap.get(method) || { amount: 0, count: 0 };
      paymentMethodMap.set(method, {
        amount: current.amount + Number(item._sum.amount || 0),
        count: current.count + item._count,
      });
    });
    
    const paymentMethodStats = Array.from(paymentMethodMap.entries())
      .map(([method, data]) => ({
        method,
        amount: data.amount,
        count: data.count,
        percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
    
    // 處理會員等級分布
    const memberLevelStats = memberLevelDistribution.map(item => ({
      level: item.level,
      count: item._count,
    }));
    
    // 處理消費TOP10
    const topSpendersData = topSpenders.map(member => {
      const totalSpent = member.orders.reduce((sum, order) => {
        const orderAmount = Number(order.finalAmount || 0);
        const installmentAmount = order.installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
        return sum + orderAmount + installmentAmount;
      }, 0);
      
      return {
        id: member.id,
        name: member.user?.name || '未知',
        level: member.level,
        totalSpent,
        orderCount: member.orders.length,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
    
    // 計算會員總儲值
    const totalStoredValue = await this.prisma.member.aggregate({
      _sum: { balance: true },
    });

    const result = {
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue,
        daily: dailyRevenue,
        growthRate: 0, // 暫時設為0，後續可加入成長率計算
        actualDays,
      },
      branchRevenue,
      serviceRevenue,
      paymentMethodStats,
      members: {
        total: totalMembers,
        newThisMonth: newMembersThisMonth,
        active: activeMembers,
        levelDistribution: memberLevelStats,
        topSpenders: topSpendersData,
        totalStoredValue: Number(totalStoredValue._sum.balance || 0),
      },
    };

    // 快取結果
    await this.cacheService.set(cacheKey, result, 180); // 3分鐘快取

    return result;
  }

  // 清除快取
  async clearCache(branchId?: string, dateRange?: string) {
    if (dateRange) {
      const cacheKey = `analytics:${branchId || 'all'}:${dateRange}:${DateTime.now().setZone('Asia/Taipei').toFormat('yyyy-MM-dd')}`;
      this.cacheService.invalidate(cacheKey);
    } else {
      // 清除所有快取
      this.cacheService.invalidateAll();
    }
    console.log('🗑️ 已清除快取:', { branchId, dateRange });
  }
}
