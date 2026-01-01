import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache.service';
import { AdminAnalyticsUnifiedService } from './admin-analytics-unified.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS')
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private analyticsService: AdminAnalyticsUnifiedService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return {
      message: 'Welcome to Admin Dashboard',
      data: {
        totalUsers: 0,
        totalServices: 0,
        totalAppointments: 0,
      }
    };
  }

  @Get('stats')
  async getStats(@Req() req: any, @Query('branchId') queryBranchId?: string) {
    // 使用快取
    const cacheKey = `dashboard:stats:${req.user.role}:${queryBranchId || req.user.branchId || 'all'}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchDashboardStats(req, queryBranchId),
      2 * 60 * 1000, // 2分鐘快取
    );
  }

  private async fetchDashboardStats(@Req() req: any, @Query('branchId') queryBranchId?: string) {
    console.log('🔍 Admin stats endpoint called');
    console.log('🔍 Request user:', req.user);
    console.log('🔍 Query branchId:', queryBranchId);
    
    const userRole = req.user.role;
    const userBranchId = req.user.branchId;

    // 構建 where 條件
    const whereCondition: any = {};
    
    // 僅 BOSS 可使用 branchId 篩選
    if (userRole === 'BOSS' && queryBranchId && queryBranchId !== 'all') {
      whereCondition.branchId = queryBranchId;
    }
    // 如果是 BOSS 且 queryBranchId 為 'all' 或未提供，則不過濾分店

    // 使用 Promise.allSettled 避免單一錯誤導致整包變 0
    const [usersResult, servicesResult, appointmentsResult, revenueResult] = await Promise.allSettled([
      // 1. 用戶統計：改用 Member 表，不依賴 user.role
      (async () => {
        try {
          const memberWhere: any = {};
          if (whereCondition.branchId) {
            memberWhere.user = { branchId: whereCondition.branchId };
          }

          const [totalUsers, activeUsers] = await Promise.all([
            this.prisma.member.count({ where: memberWhere }),
            this.prisma.member.count({
              where: {
                ...memberWhere,
                user: {
                  ...(memberWhere.user || {}),
                  isActive: true,
                },
              },
            }),
          ]);

          return { total: totalUsers, active: activeUsers };
        } catch (error) {
          console.error('❌ Error fetching user stats:', error);
          throw error;
        }
      })(),

      // 2. 服務統計
      (async () => {
        try {
          const [totalServices, activeServices] = await Promise.all([
            this.prisma.service.count(),
            this.prisma.service.count({ where: { isActive: true } }),
          ]);

          return { total: totalServices, active: activeServices };
        } catch (error) {
          console.error('❌ Error fetching service stats:', error);
          throw error;
        }
      })(),

      // 3. 預約統計
      (async () => {
        try {
          const [totalAppointments, pendingAppointments, confirmedAppointments] = await Promise.all([
            this.prisma.appointment.count({ where: whereCondition }),
            this.prisma.appointment.count({
              where: { ...whereCondition, status: 'PENDING' },
            }),
            this.prisma.appointment.count({
              where: { ...whereCondition, status: 'CONFIRMED' },
            }),
          ]);

          // 獲取今日預約數
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const todayAppointments = await this.prisma.appointment.count({
            where: {
              ...whereCondition,
              startAt: { gte: today, lt: tomorrow },
            },
          });

          return {
            total: totalAppointments,
            pending: pendingAppointments,
            confirmed: confirmedAppointments,
            today: todayAppointments,
          };
        } catch (error) {
          console.error('❌ Error fetching appointment stats:', error);
          throw error;
        }
      })(),

      // 4. 營收統計
      (async () => {
        try {
          const paymentWhere: any = {
            paidAt: { not: null },
            ...(whereCondition.branchId ? { bill: { branchId: whereCondition.branchId } } : {}),
          };

          const totalRevenue = await this.prisma.payment.aggregate({
            where: paymentWhere,
            _sum: { amount: true },
          });

          const totalRevenueAmount = Number(totalRevenue._sum.amount || 0);

          // 獲取本月營收
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const monthlyRevenue = await this.prisma.payment.aggregate({
            where: {
              ...paymentWhere,
              paidAt: { gte: startOfMonth },
            },
            _sum: { amount: true },
          });

          const monthlyRevenueAmount = Number(monthlyRevenue._sum.amount || 0);

          return {
            total: totalRevenueAmount,
            monthly: monthlyRevenueAmount,
          };
        } catch (error) {
          console.error('❌ Error fetching revenue stats:', error);
          throw error;
        }
      })(),
    ]);

    // 組合結果，失敗的回傳 0（但不影響其他）
    return {
      users:
        usersResult.status === 'fulfilled'
          ? usersResult.value
          : { total: 0, active: 0 },
      services:
        servicesResult.status === 'fulfilled'
          ? servicesResult.value
          : { total: 0, active: 0 },
      appointments:
        appointmentsResult.status === 'fulfilled'
          ? appointmentsResult.value
          : { total: 0, pending: 0, confirmed: 0, today: 0 },
      revenue:
        revenueResult.status === 'fulfilled'
          ? revenueResult.value
          : { total: 0, monthly: 0 },
    };
  }
}
