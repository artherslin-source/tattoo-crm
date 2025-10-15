import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminController {
  constructor(private prisma: PrismaService) {}

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
    try {
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;

      // 構建 where 條件
      const whereCondition: any = {};
      
      // 優先使用查詢參數中的 branchId（僅 BOSS 可以使用）
      if (userRole === 'BOSS' && queryBranchId && queryBranchId !== 'all') {
        whereCondition.branchId = queryBranchId;
      } else if (userRole !== 'BOSS') {
        // BRANCH_MANAGER 使用自己的 branchId
        whereCondition.branchId = userBranchId;
      }
      // 如果是 BOSS 且 queryBranchId 為 'all' 或未提供，則不過濾分店

      // 獲取用戶統計
      const [totalUsers, activeUsers] = await Promise.all([
        this.prisma.user.count({
          where: {
            ...whereCondition,
            role: 'MEMBER'
          }
        }),
        this.prisma.user.count({
          where: {
            ...whereCondition,
            role: 'MEMBER',
            isActive: true
          }
        })
      ]);

      // 獲取服務統計
      const [totalServices, activeServices] = await Promise.all([
        this.prisma.service.count(),
        this.prisma.service.count({
          where: { isActive: true }
        })
      ]);

      // 獲取預約統計
      const [totalAppointments, pendingAppointments, confirmedAppointments] = await Promise.all([
        this.prisma.appointment.count({
          where: whereCondition
        }),
        this.prisma.appointment.count({
          where: {
            ...whereCondition,
            status: 'PENDING'
          }
        }),
        this.prisma.appointment.count({
          where: {
            ...whereCondition,
            status: 'CONFIRMED'
          }
        })
      ]);

      // 獲取今日預約數
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAppointments = await this.prisma.appointment.count({
        where: {
          ...whereCondition,
          startAt: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      // 獲取總營收：一次付清訂單的 finalAmount + 分期訂單中已付款的分期金額
      const paidStatuses: OrderStatus[] = [
        'PAID',
        'PAID_COMPLETE',
        'INSTALLMENT_ACTIVE',
        'PARTIALLY_PAID',
        'COMPLETED'
      ];

      // 1. 計算一次付清且已付款的訂單
      const oneTimeRevenue = await this.prisma.order.aggregate({
        where: {
          ...whereCondition,
          paymentType: 'ONE_TIME',
          status: { in: paidStatuses }
        },
        _sum: { finalAmount: true }
      });

      // 2. 計算分期訂單中已付款的分期金額
      const installmentRevenue = await this.prisma.installment.aggregate({
        where: {
          status: 'PAID',
          order: whereCondition
        },
        _sum: { amount: true }
      });

      const totalRevenueAmount = 
        Number(oneTimeRevenue._sum.finalAmount || 0) + 
        Number(installmentRevenue._sum.amount || 0);

      // 獲取本月營收
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // 1. 計算本月一次付清且已付款的訂單
      const monthlyOneTimeRevenue = await this.prisma.order.aggregate({
        where: {
          ...whereCondition,
          paymentType: 'ONE_TIME',
          status: { in: paidStatuses },
          createdAt: { gte: startOfMonth }
        },
        _sum: { finalAmount: true }
      });

      // 2. 計算本月分期訂單中已付款的分期金額
      const monthlyInstallmentRevenue = await this.prisma.installment.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: startOfMonth },
          order: whereCondition
        },
        _sum: { amount: true }
      });

      const monthlyRevenueAmount = 
        Number(monthlyOneTimeRevenue._sum.finalAmount || 0) + 
        Number(monthlyInstallmentRevenue._sum.amount || 0);

      return {
        users: { 
          total: totalUsers, 
          active: activeUsers 
        },
        services: { 
          total: totalServices, 
          active: activeServices 
        },
        appointments: { 
          total: totalAppointments, 
          pending: pendingAppointments, 
          confirmed: confirmedAppointments,
          today: todayAppointments
        },
        revenue: {
          total: totalRevenueAmount,
          monthly: monthlyRevenueAmount
        }
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      return {
        users: { total: 0, active: 0 },
        services: { total: 0, active: 0 },
        appointments: { total: 0, pending: 0, confirmed: 0, today: 0 },
        revenue: { total: 0, monthly: 0 }
      };
    }
  }
}
