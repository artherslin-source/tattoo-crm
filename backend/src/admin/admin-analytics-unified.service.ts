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

  // 安全轉換 BigInt 為 Number（解決 PostgreSQL 原生查詢的 BigInt 序列化問題）
  private safeBigIntToNumber(value: bigint | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return typeof value === 'bigint' ? Number(value) : Number(value);
  }

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
    const branchCondition = branchFilter.branchId ? 'AND o."branchId" = $3' : '';
    const params = [range.start, range.end];
    if (branchFilter.branchId) {
      params.push(branchFilter.branchId);
    }

    const result = await this.prisma.$queryRawUnsafe<{ total: bigint | number }[]>(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM (
        SELECT o."finalAmount" AS amount FROM "Order" o
          WHERE o."paymentType"='ONE_TIME' AND o."status" IN ('PAID','PAID_COMPLETE','INSTALLMENT_ACTIVE','PARTIALLY_PAID','COMPLETED')
            AND o."paidAt" BETWEEN $1 AND $2
            ${branchCondition}
        UNION ALL
        SELECT i."amount" FROM "Installment" i
          JOIN "Order" o ON i."orderId" = o.id
          WHERE i."status"='PAID' AND i."paidAt" BETWEEN $1 AND $2
            ${branchCondition}
      ) t
    `, ...params);

    return this.safeBigIntToNumber(result[0]?.total);
  }

  // 付款方式本地化顯示名稱
  private getPaymentMethodDisplayName(method: string): string {
    const paymentMethodMap: { [key: string]: string } = {
      'CASH': '現金',
      'CREDIT_CARD': '信用卡',
      'BANK_TRANSFER': '銀行轉帳',
      'LINE_PAY': 'LINE Pay',
      'APPLE_PAY': 'Apple Pay',
      'GOOGLE_PAY': 'Google Pay',
      'UNKNOWN': '未設定'
    };
    return paymentMethodMap[method] || method;
  }

  // 查詢第一筆訂單的日期（用於計算全部時間的日均營收）
  private async getFirstOrderDate(): Promise<Date | null> {
    const result = await this.prisma.$queryRawUnsafe<{ first_date: Date }[]>(`
      SELECT MIN(paid_date) AS first_date
      FROM (
        SELECT o."paidAt" AS paid_date FROM "Order" o
          WHERE o."paymentType"='ONE_TIME' AND o."status" IN ('PAID','PAID_COMPLETE','INSTALLMENT_ACTIVE','PARTIALLY_PAID','COMPLETED')
            AND o."paidAt" IS NOT NULL
        UNION ALL
        SELECT i."paidAt" AS paid_date FROM "Installment" i
          JOIN "Order" o ON i."orderId" = o.id
          WHERE i."status"='PAID' AND i."paidAt" IS NOT NULL
      ) t
    `);
    
    return result[0]?.first_date || null;
  }

  // 活躍會員查詢（統一使用 paidAt）
  private async getActiveMembers(range: TimeRange, branchFilter: any = {}) {
    const branchCondition = branchFilter.branchId ? 'AND o."branchId" = $3' : '';
    const params = [range.start, range.end];
    if (branchFilter.branchId) {
      params.push(branchFilter.branchId);
    }

    const result = await this.prisma.$queryRawUnsafe<{ count: bigint | number }[]>(`
      SELECT COUNT(DISTINCT t."memberId") AS count
      FROM (
        SELECT o."memberId" FROM "Order" o
          WHERE o."paymentType"='ONE_TIME' AND o."status" IN ('PAID','PAID_COMPLETE','INSTALLMENT_ACTIVE','PARTIALLY_PAID','COMPLETED')
            AND o."paidAt" BETWEEN $1 AND $2
            ${branchCondition}
        UNION
        SELECT o."memberId" FROM "Installment" i
          JOIN "Order" o ON i."orderId" = o.id
          WHERE i."status"='PAID' AND i."paidAt" BETWEEN $1 AND $2
            ${branchCondition}
      ) t
    `, ...params);
    
    return this.safeBigIntToNumber(result[0]?.count);
  }

  // 預約統計查詢
  private async getAppointmentStats(range: TimeRange, branchFilter: any = {}) {
    const branchCondition = branchFilter.branchId ? 'AND a."branchId" = $3' : '';
    const params = [range.start, range.end];
    if (branchFilter.branchId) {
      params.push(branchFilter.branchId);
    }

    // 總預約數
    const totalResult = await this.prisma.$queryRawUnsafe<{ count: bigint | number }[]>(`
      SELECT COUNT(*) AS count
      FROM "Appointment" a
      WHERE a."createdAt" BETWEEN $1 AND $2
        ${branchCondition}
    `, ...params);

    // 預約狀態分布
    const statusResult = await this.prisma.$queryRawUnsafe<{ status: string, count: bigint | number }[]>(`
      SELECT a."status", COUNT(*) AS count
      FROM "Appointment" a
      WHERE a."createdAt" BETWEEN $1 AND $2
        ${branchCondition}
      GROUP BY a."status"
    `, ...params);

    // 轉換率計算（已完成預約 / 總預約）
    const completedCount = statusResult.find(s => s.status === 'COMPLETED')?.count || 0;
    const totalCount = this.safeBigIntToNumber(totalResult[0]?.count);
    const conversionRate = totalCount > 0 ? (this.safeBigIntToNumber(completedCount) / totalCount) * 100 : 0;

    return {
      total: totalCount,
      pending: this.safeBigIntToNumber(statusResult.find(s => s.status === 'PENDING')?.count || 0),
      confirmed: this.safeBigIntToNumber(statusResult.find(s => s.status === 'CONFIRMED')?.count || 0),
      completed: this.safeBigIntToNumber(completedCount),
      cancelled: this.safeBigIntToNumber(statusResult.find(s => s.status === 'CANCELLED')?.count || 0),
      conversionRate: Math.round(conversionRate * 100) / 100,
      byStatus: statusResult.map(item => ({
        status: item.status,
        count: this.safeBigIntToNumber(item.count),
      })),
      byTimeSlot: [], // 暫時留空，可後續實現
    };
  }

  // 刺青師績效查詢
  private async getArtistStats(range: TimeRange, branchFilter: any = {}) {
    const branchCondition = branchFilter.branchId ? 'AND a."branchId" = $3' : '';
    const params = [range.start, range.end];
    if (branchFilter.branchId) {
      params.push(branchFilter.branchId);
    }

    // 總刺青師數
    const totalResult = await this.prisma.$queryRawUnsafe<{ count: bigint | number }[]>(`
      SELECT COUNT(*) AS count
      FROM "TattooArtist" a
      WHERE a."active" = true
        ${branchCondition}
    `, ...params);

    // 活躍刺青師（在指定時間範圍內有預約的刺青師）
    const activeResult = await this.prisma.$queryRawUnsafe<{ count: bigint | number }[]>(`
      SELECT COUNT(DISTINCT a."artistId") AS count
      FROM "Appointment" a
      WHERE a."createdAt" BETWEEN $1 AND $2
        ${branchCondition}
    `, ...params);

    // 績效 TOP 5（按預約完成數）
    const topPerformersResult = await this.prisma.$queryRawUnsafe<{ 
      artistId: string, 
      artistName: string, 
      completedCount: bigint | number,
      totalRevenue: bigint | number 
    }[]>(`
      SELECT 
        a."artistId",
        ar."displayName" AS "artistName",
        COUNT(CASE WHEN a."status" = 'COMPLETED' THEN 1 END) AS "completedCount",
        COALESCE(SUM(o."finalAmount"), 0) AS "totalRevenue"
      FROM "Appointment" a
      JOIN "TattooArtist" ar ON a."artistId" = ar.id
      LEFT JOIN "Order" o ON a."orderId" = o.id
      WHERE a."createdAt" BETWEEN $1 AND $2
        ${branchCondition}
      GROUP BY a."artistId", ar."displayName"
      ORDER BY "completedCount" DESC, "totalRevenue" DESC
      LIMIT 5
    `, ...params);

    return {
      total: this.safeBigIntToNumber(totalResult[0]?.count),
      topPerformers: topPerformersResult.map(item => ({
        artistId: item.artistId,
        artistName: item.artistName,
        revenue: this.safeBigIntToNumber(item.totalRevenue),
        completedServices: this.safeBigIntToNumber(item.completedCount),
        avgRating: 0, // 暫時設為0，可後續實現評分系統
      })),
    };
  }

  // 服務項目分析查詢
  private async getServiceStats(range: TimeRange, branchFilter: any = {}) {
    const branchCondition = branchFilter.branchId ? 'AND a."branchId" = $3' : '';
    const params = [range.start, range.end];
    if (branchFilter.branchId) {
      params.push(branchFilter.branchId);
    }

    // 總服務數
    const totalResult = await this.prisma.$queryRawUnsafe<{ count: bigint | number }[]>(`
      SELECT COUNT(*) AS count
      FROM "Service" s
      WHERE s."isActive" = true
    `);

    // 熱門服務 TOP 5（按預約數）
    const topServicesResult = await this.prisma.$queryRawUnsafe<{ 
      serviceId: string, 
      serviceName: string, 
      appointmentCount: bigint | number,
      totalRevenue: bigint | number 
    }[]>(`
      SELECT 
        a."serviceId",
        s."name" AS "serviceName",
        COUNT(*) AS "appointmentCount",
        COALESCE(SUM(o."finalAmount"), 0) AS "totalRevenue"
      FROM "Appointment" a
      JOIN "Service" s ON a."serviceId" = s.id
      LEFT JOIN "Order" o ON a."orderId" = o.id
      WHERE a."createdAt" BETWEEN $1 AND $2
        ${branchCondition}
      GROUP BY a."serviceId", s."name"
      ORDER BY "appointmentCount" DESC, "totalRevenue" DESC
      LIMIT 5
    `, ...params);

    return {
      total: this.safeBigIntToNumber(totalResult[0]?.count),
      topServices: topServicesResult.map(item => ({
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        bookingCount: this.safeBigIntToNumber(item.appointmentCount),
        completionRate: 0, // 暫時設為0，可後續實現完成率計算
        revenue: this.safeBigIntToNumber(item.totalRevenue),
      })),
    };
  }

  async getAnalytics(branchId?: string, dateRange: string = '30d') {
    // 轉換 dateRange 為 RangeKey
    const rangeKey: RangeKey = dateRange === '7d' ? '7d' : 
                              dateRange === '30d' ? '30d' : 
                              dateRange === '90d' ? '90d' : 
                              dateRange === '1y' ? '365d' :  // 修復：前端傳遞 '1y'，後端期望 '365d'
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

    // 調試本月營收查詢
    console.log('🔍 Monthly revenue debug:', {
      monthStart: monthRange.start,
      monthEnd: monthRange.end,
      currentTime: DateTime.now().setZone('Asia/Taipei').toISO(),
      monthStartISO: new Date(monthRange.start).toISOString(),
      monthEndISO: new Date(monthRange.end).toISOString()
    });

    // 按照 ChatGPT 方案：使用原生 SQL 查詢所有統計數據
    const branchCondition = branchFilter.branchId ? 'AND o."branchId" = $3' : '';
    const baseParams = [currentRange.start, currentRange.end];
    const branchParams = branchFilter.branchId ? [branchFilter.branchId] : [];
    const allParams = [...baseParams, ...branchParams];

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
      (async () => {
        const monthlyRev = await this.revenueByPaidAt(monthRange, branchFilter);
        console.log('🔍 Monthly revenue result:', {
          monthlyRevenue: monthlyRev,
          monthRange: monthRange,
          branchFilter: branchFilter
        });
        return monthlyRev;
      })(),
      
      // 活躍會員（根據選擇的時間範圍）
      this.getActiveMembers(currentRange, branchFilter),
      
      // 分店營收排行（使用原生 SQL）
      this.prisma.$queryRawUnsafe<{ branch_id: string; revenue: bigint | number }[]>(`
        SELECT "branchId" AS branch_id, SUM(amount) AS revenue
        FROM (
          SELECT o."branchId", o."finalAmount" AS amount FROM "Order" o
            WHERE o."paymentType"='ONE_TIME' AND o."status" IN ('PAID','PAID_COMPLETE','INSTALLMENT_ACTIVE','PARTIALLY_PAID','COMPLETED')
              AND o."paidAt" BETWEEN $1 AND $2
              ${branchCondition}
          UNION ALL
          SELECT o."branchId", i."amount" FROM "Installment" i
            JOIN "Order" o ON i."orderId" = o.id
            WHERE i."status"='PAID' AND i."paidAt" BETWEEN $1 AND $2
              ${branchCondition}
        ) t
        GROUP BY "branchId"
        ORDER BY revenue DESC
        LIMIT 5
      `, ...allParams),
      
      // 服務項目營收（使用原生 SQL）
      this.prisma.$queryRawUnsafe<{ service_id: string; service_name: string; revenue: bigint | number; count: bigint | number }[]>(`
        SELECT s.id AS service_id, s.name AS service_name, SUM(amount) AS revenue, COUNT(*) AS count
        FROM (
          SELECT a."serviceId", o."finalAmount" AS amount FROM "Order" o
            JOIN "Appointment" a ON o."appointmentId" = a.id
            WHERE o."paymentType"='ONE_TIME' AND o."status" IN ('PAID','PAID_COMPLETE','INSTALLMENT_ACTIVE','PARTIALLY_PAID','COMPLETED')
              AND o."paidAt" BETWEEN $1 AND $2
              ${branchCondition}
              AND a."serviceId" IS NOT NULL
          UNION ALL
          SELECT a."serviceId", i."amount" FROM "Installment" i
            JOIN "Order" o ON i."orderId" = o.id
            JOIN "Appointment" a ON o."appointmentId" = a.id
            WHERE i."status"='PAID' AND i."paidAt" BETWEEN $1 AND $2
              ${branchCondition}
              AND a."serviceId" IS NOT NULL
        ) t
        JOIN "Service" s ON t."serviceId" = s.id
        GROUP BY s.id, s.name
        ORDER BY revenue DESC
        LIMIT 5
      `, ...allParams),
      
      // 付款方式統計（使用原生 SQL）
      this.prisma.$queryRawUnsafe<{ method: string; amount: bigint | number; count: bigint | number }[]>(`
        SELECT method, SUM(amount) AS amount, COUNT(*) AS count
        FROM (
          SELECT COALESCE(o."paymentMethod", 'UNKNOWN') AS method, o."finalAmount" AS amount FROM "Order" o
            WHERE o."paymentType"='ONE_TIME' AND o."status" IN ('PAID','PAID_COMPLETE','INSTALLMENT_ACTIVE','PARTIALLY_PAID','COMPLETED')
              AND o."paidAt" BETWEEN $1 AND $2
              ${branchCondition}
          UNION ALL
          SELECT COALESCE(i."paymentMethod", 'UNKNOWN') AS method, i."amount" FROM "Installment" i
            JOIN "Order" o ON i."orderId" = o.id
            WHERE i."status"='PAID' AND i."paidAt" BETWEEN $1 AND $2
              ${branchCondition}
        ) t
        GROUP BY method
        ORDER BY amount DESC
      `, ...allParams),
      
      // 會員總數
      this.prisma.member.count(),
      
      // 本月新增會員
      this.prisma.member.count({
        where: {
          user: { createdAt: { gte: monthRange.start } },
        },
      }),
      
      // 會員等級分布（使用原生 SQL）
      this.prisma.$queryRawUnsafe<{ level: string; count: bigint | number }[]>(`
        SELECT COALESCE("membershipLevel", 'UNKNOWN') AS level, COUNT(*) AS count
        FROM "Member" m
        GROUP BY "membershipLevel"
        ORDER BY count DESC
      `),
      
      // 消費TOP10（使用原生 SQL）
      this.prisma.$queryRawUnsafe<{ id: string; name: string; level: string; total_spent: bigint | number }[]>(`
        SELECT m.id, COALESCE(u.name, '未知') AS name, COALESCE(m."membershipLevel", 'UNKNOWN') AS level, m."totalSpent" AS total_spent
        FROM "Member" m
        LEFT JOIN "User" u ON m."userId" = u.id
        ORDER BY m."totalSpent" DESC
        LIMIT 10
      `),
    ]);

    // 計算日均營收
    let dailyRevenue: number;
    let actualDays: number | null = null;
    
    if (rangeKey === 'all') {
      // 全部時間：計算從第一筆訂單到現在的實際天數
      if (totalRevenue > 0) {
        // 查詢第一筆訂單的日期
        const firstOrderDate = await this.getFirstOrderDate();
        if (firstOrderDate) {
          const now = DateTime.now().setZone('Asia/Taipei');
          const firstDate = DateTime.fromJSDate(firstOrderDate).setZone('Asia/Taipei');
          const totalDays = Math.max(1, now.diff(firstDate, 'days').days); // 至少1天
          dailyRevenue = Math.round(totalRevenue / totalDays);
          actualDays = Math.round(totalDays);
        } else {
          dailyRevenue = 0;
          actualDays = null;
        }
      } else {
        dailyRevenue = 0;
        actualDays = null;
      }
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

    // 按照 ChatGPT 方案處理結果格式，完全匹配前端期望的數據結構
    const result = {
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue,
        daily: dailyRevenue,
        trend: 0, // 暫時設為0，後續可加入成長率計算
        actualDays,
        byBranch: await Promise.all(branchRevenue.map(async (item) => {
          // 查詢分店名稱
          const branch = await this.prisma.branch.findUnique({
            where: { id: item.branch_id },
            select: { name: true }
          });
          return {
            branchId: item.branch_id,
            branchName: branch?.name || `分店 ${item.branch_id}`,
            amount: this.safeBigIntToNumber(item.revenue),
          };
        })),
        byService: serviceRevenue.map(item => ({
          serviceId: item.service_name, // 簡化處理
          serviceName: item.service_name,
          amount: this.safeBigIntToNumber(item.revenue),
          count: this.safeBigIntToNumber(item.count),
        })),
        byPaymentMethod: paymentMethodStats.map(item => ({
          method: this.getPaymentMethodDisplayName(item.method),
          amount: this.safeBigIntToNumber(item.amount),
          count: this.safeBigIntToNumber(item.count),
        })),
      },
      members: {
        total: totalMembers,
        newThisMonth: newMembersThisMonth,
        activeMembers: activeMembers,
        byLevel: memberLevelStats.map(item => ({
          level: item.level,
          count: this.safeBigIntToNumber(item.count),
        })),
        topSpenders: topSpendersData.map(item => ({
          userId: item.id,
          userName: item.name,
          totalSpent: this.safeBigIntToNumber(item.total_spent),
          balance: 0, // 簡化處理，實際應該查詢餘額
        })),
        totalBalance: this.safeBigIntToNumber(totalStoredValue._sum.balance),
      },
      appointments: await this.getAppointmentStats(currentRange, branchFilter),
      artists: await this.getArtistStats(currentRange, branchFilter),
      services: await this.getServiceStats(currentRange, branchFilter),
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
