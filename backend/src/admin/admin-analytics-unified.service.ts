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

  // 單一口徑：用 paidAt 聚合營收（使用原生 SQL 避免 Prisma 類型問題）
  private async revenueByPaidAt(range: TimeRange, branchFilter: any = {}) {
    const branchCondition = branchFilter.branchId ? 'AND o.branch_id = $3' : '';
    const params = [range.start, range.end];
    if (branchFilter.branchId) {
      params.push(branchFilter.branchId);
    }

    const result = await this.prisma.$queryRawUnsafe<{ total: number }[]>(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM (
        SELECT final_amount AS amount FROM "Order" o
          WHERE payment_type='ONE_TIME' AND status IN ('PAID','PAID_COMPLETE','INSTALLMENT_ACTIVE','PARTIALLY_PAID','COMPLETED')
            AND paid_at BETWEEN $1 AND $2
            ${branchCondition}
        UNION ALL
        SELECT amount FROM "Installment" i
          JOIN "Order" o ON i.order_id = o.id
          WHERE i.status='PAID' AND i.paid_at BETWEEN $1 AND $2
            ${branchCondition}
      ) t
    `, ...params);

    return Number(result[0]?.total || 0);
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
    
    // 使用 getOrSet 方法來處理快取
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchAnalyticsData(branchId, dateRange, rangeKey),
      180 * 1000 // 3分鐘快取
    );
  }

  private async fetchAnalyticsData(branchId: string | undefined, dateRange: string, rangeKey: RangeKey) {
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

    // 按照 ChatGPT 方案：使用原生 SQL 查詢所有統計數據
    const branchCondition = branchFilter.branchId ? 'AND o.branch_id = $3' : '';
    const params = [currentRange.start, currentRange.end];
    if (branchFilter.branchId) {
      params.push(branchFilter.branchId);
    }

    const [
      totalRevenue,
      monthlyRevenue,
      activeMembers,
      branchRevenue,
      serviceRevenue,
      paymentMethodStats,
      totalMembers,
      newMembersThisMonth,
      memberLevelStats,
      topSpendersData,
    ] = await Promise.all([
      // 總營收（使用統一查詢）
      this.revenueByPaidAt(currentRange, branchFilter),
      
      // 月營收（使用統一查詢）
      this.revenueByPaidAt(monthRange, branchFilter),
      
      // 活躍會員（近30天有消費）
      this.getActiveMembers(
        {
          start: new Date(DateTime.now().setZone('Asia/Taipei').minus({ days: 30 }).startOf('day').toJSDate()),
          end: new Date(DateTime.now().setZone('Asia/Taipei').endOf('day').toJSDate())
        },
        branchFilter
      ),
      
      // 分店營收排行（使用原生 SQL）
      this.prisma.$queryRawUnsafe<{ branch_id: string; revenue: number }[]>(`
        SELECT branch_id, SUM(amount) AS revenue
        FROM (
          SELECT o.branch_id, final_amount AS amount FROM "Order" o
            WHERE payment_type='ONE_TIME' AND status IN ('PAID','PAID_COMPLETE','INSTALLMENT_ACTIVE','PARTIALLY_PAID','COMPLETED')
              AND paid_at BETWEEN $1 AND $2
              ${branchCondition}
          UNION ALL
          SELECT o.branch_id, i.amount FROM "Installment" i
            JOIN "Order" o ON i.order_id = o.id
            WHERE i.status='PAID' AND i.paid_at BETWEEN $1 AND $2
              ${branchCondition}
        ) t
        GROUP BY branch_id
        ORDER BY revenue DESC
        LIMIT 5
      `, ...params),
      
      // 服務項目營收（使用原生 SQL）
      this.prisma.$queryRawUnsafe<{ service_id: string; service_name: string; revenue: number; count: number }[]>(`
        SELECT s.id AS service_id, s.name AS service_name, SUM(amount) AS revenue, COUNT(*) AS count
        FROM (
          SELECT a.service_id, final_amount AS amount FROM "Order" o
            JOIN "Appointment" a ON o.appointment_id = a.id
            WHERE payment_type='ONE_TIME' AND status IN ('PAID','PAID_COMPLETE','INSTALLMENT_ACTIVE','PARTIALLY_PAID','COMPLETED')
              AND paid_at BETWEEN $1 AND $2
              ${branchCondition}
              AND a.service_id IS NOT NULL
          UNION ALL
          SELECT a.service_id, i.amount FROM "Installment" i
            JOIN "Order" o ON i.order_id = o.id
            JOIN "Appointment" a ON o.appointment_id = a.id
            WHERE i.status='PAID' AND i.paid_at BETWEEN $1 AND $2
              ${branchCondition}
              AND a.service_id IS NOT NULL
        ) t
        JOIN "Service" s ON t.service_id = s.id
        GROUP BY s.id, s.name
        ORDER BY revenue DESC
        LIMIT 5
      `, ...params),
      
      // 付款方式統計（使用原生 SQL）
      this.prisma.$queryRawUnsafe<{ method: string; amount: number; count: number }[]>(`
        SELECT method, SUM(amount) AS amount, COUNT(*) AS count
        FROM (
          SELECT COALESCE(payment_method, 'UNKNOWN') AS method, final_amount AS amount FROM "Order" o
            WHERE payment_type='ONE_TIME' AND status IN ('PAID','PAID_COMPLETE','INSTALLMENT_ACTIVE','PARTIALLY_PAID','COMPLETED')
              AND paid_at BETWEEN $1 AND $2
              ${branchCondition}
          UNION ALL
          SELECT COALESCE(payment_method, 'UNKNOWN') AS method, amount FROM "Installment" i
            JOIN "Order" o ON i.order_id = o.id
            WHERE i.status='PAID' AND i.paid_at BETWEEN $1 AND $2
              ${branchCondition}
        ) t
        GROUP BY method
        ORDER BY amount DESC
      `, ...params),
      
      // 會員總數
      this.prisma.member.count(),
      
      // 本月新增會員
      this.prisma.member.count({
        where: {
          user: { createdAt: { gte: monthRange.start } },
        },
      }),
      
      // 會員等級分布（使用原生 SQL）
      this.prisma.$queryRawUnsafe<{ level: string; count: number }[]>(`
        SELECT COALESCE(membership_level, 'UNKNOWN') AS level, COUNT(*) AS count
        FROM "Member" m
        GROUP BY membership_level
        ORDER BY count DESC
      `),
      
      // 消費TOP10（使用原生 SQL）
      this.prisma.$queryRawUnsafe<{ id: string; name: string; level: string; total_spent: number }[]>(`
        SELECT m.id, COALESCE(u.name, '未知') AS name, COALESCE(m.membership_level, 'UNKNOWN') AS level, m.total_spent
        FROM "Member" m
        LEFT JOIN "User" u ON m.user_id = u.id
        ORDER BY m.total_spent DESC
        LIMIT 10
      `),
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
    
    // 計算會員總儲值
    const totalStoredValue = await this.prisma.member.aggregate({
      _sum: { balance: true },
    });

    // 按照 ChatGPT 方案處理結果格式
    const result = {
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue,
        daily: dailyRevenue,
        growthRate: 0, // 暫時設為0，後續可加入成長率計算
        actualDays,
      },
      branchRevenue: branchRevenue.map(item => ({
        branchId: item.branch_id,
        revenue: Number(item.revenue),
      })),
      serviceRevenue: serviceRevenue.map(item => ({
        name: item.service_name,
        revenue: Number(item.revenue),
        count: Number(item.count),
      })),
      paymentMethodStats: paymentMethodStats.map(item => ({
        method: item.method,
        amount: Number(item.amount),
        count: Number(item.count),
        percentage: totalRevenue > 0 ? (Number(item.amount) / totalRevenue) * 100 : 0,
      })),
      members: {
        total: totalMembers,
        newThisMonth: newMembersThisMonth,
        active: activeMembers,
        levelDistribution: memberLevelStats.map(item => ({
          level: item.level,
          count: Number(item.count),
        })),
        topSpenders: topSpendersData.map(item => ({
          id: item.id,
          name: item.name,
          level: item.level,
          totalSpent: Number(item.total_spent),
          orderCount: 0, // 簡化處理
        })),
        totalStoredValue: Number(totalStoredValue._sum.balance || 0),
      },
    };

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
