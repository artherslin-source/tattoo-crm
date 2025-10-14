import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

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
  async getStats(@Req() req: any) {
    try {
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;

      // 構建 where 條件
      const whereCondition: any = {};
      if (userRole !== 'BOSS') {
        whereCondition.branchId = userBranchId;
      }

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

      // 獲取總營收（所有已完成的訂單）
      const paidStatuses: Prisma.OrderStatus[] = [
        'PAID',
        'PAID_COMPLETE',
        'INSTALLMENT_ACTIVE',
        'PARTIALLY_PAID',
        'COMPLETED'
      ];

      const totalRevenue = await this.prisma.order.aggregate({
        where: {
          ...whereCondition,
          status: { in: paidStatuses }
        },
        _sum: {
          finalAmount: true
        }
      });

      // 獲取本月營收
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyRevenue = await this.prisma.order.aggregate({
        where: {
          ...whereCondition,
          status: { in: paidStatuses },
          createdAt: {
            gte: startOfMonth
          }
        },
        _sum: {
          finalAmount: true
        }
      });

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
          total: totalRevenue._sum.finalAmount || 0,
          monthly: monthlyRevenue._sum.finalAmount || 0
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
