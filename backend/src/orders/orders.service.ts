import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface GetOrdersQuery {
  branchId?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreateOrderInput {
  memberId: string;
  branchId: string;
  appointmentId?: string | null;
  totalAmount: number;
  paymentType: 'ONE_TIME' | 'INSTALLMENT';
  useStoredValue?: boolean;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** 列表/統計 共用：把查詢參數轉成 Prisma where */
  private buildWhere(query: GetOrdersQuery, userRole: string, userBranchId?: string): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};

    // 如果不是 BOSS，只能查看自己分店的訂單
    if (userRole !== 'BOSS') {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      // BOSS 可以指定分店查看
      where.branchId = query.branchId;
    }
    
    if (query.status) {
      where.status = query.status as any;
    }

    return where;
  }

  async create(input: CreateOrderInput) {
    return this.prisma.$transaction(async (tx) => {
      // 檢查用戶儲值餘額（如果使用儲值付款）
      if (input.useStoredValue) {
        const member = await tx.member.findUnique({
          where: { userId: input.memberId },
          select: { balance: true },
        });

        if (!member || member.balance < input.totalAmount) {
          throw new Error('Insufficient stored value balance');
        }
      }

      // 建立訂單
      const order = await tx.order.create({ 
        data: {
          memberId: input.memberId,
          branchId: input.branchId,
          appointmentId: input.appointmentId,
          totalAmount: input.totalAmount,
          paymentType: input.paymentType,
        },
        include: {
          member: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true } },
          installments: true,
        },
      });

      // 更新用戶財務資料
      const updateData: any = {
        totalSpent: { increment: input.totalAmount },
      };

      if (input.useStoredValue) {
        updateData.balance = { decrement: input.totalAmount };
      }

      // 確保用戶有 Member 記錄
      const member = await tx.member.findUnique({
        where: { userId: input.memberId },
      });

      if (!member) {
        // 如果沒有 Member 記錄，創建一個
        await tx.member.create({
          data: {
            userId: input.memberId,
            totalSpent: input.totalAmount,
            balance: input.useStoredValue ? -input.totalAmount : 0,
          },
        });
      } else {
        // 更新現有的 Member 記錄
        await tx.member.update({
          where: { userId: input.memberId },
          data: updateData,
        });
      }

      return order;
    });
  }

  async getOrders(query: GetOrdersQuery, userRole: string, userBranchId?: string) {
    try {
      const { page = 1, limit = 10, sortField, sortOrder } = query;
      
      // 確保 page 和 limit 是數字
      const pageNum = typeof page === 'string' ? parseInt(page) : page;
      const limitNum = typeof limit === 'string' ? parseInt(limit) : limit;
      
      console.log('🔍 getOrders called with:', { query, userRole, userBranchId });
      console.log('🔍 Page and limit types:', { pageType: typeof pageNum, limitType: typeof limitNum, pageNum, limitNum });
      
      // 使用共用的 where 構建邏輯
      const where = this.buildWhere(query, userRole, userBranchId);

      // 構建排序條件 - 簡單版本，不使用關聯排序
      let orderBy: any = { createdAt: 'desc' };
      
      console.log('🔍 Order sort filters:', { sortField, sortOrder });
      
      if (sortField && sortOrder) {
        if (sortField === 'customerName' || sortField === 'customerEmail' || sortField === 'branch') {
          // 暫時跳過關聯排序，使用默認排序
          console.log('⚠️ Skipping relational sort for:', sortField);
        } else {
          switch (sortField) {
            case 'totalAmount':
              orderBy = { totalAmount: sortOrder };
              break;
            case 'status':
              orderBy = { status: sortOrder };
              break;
            case 'createdAt':
              orderBy = { createdAt: sortOrder };
              break;
            default:
              orderBy = { createdAt: 'desc' };
          }
        }
      }

      console.log('🔍 Where condition:', JSON.stringify(where, null, 2));
      console.log('🔍 Order by:', JSON.stringify(orderBy, null, 2));

      const skip = (pageNum - 1) * limitNum;
      console.log('🔍 Pagination:', { pageNum, limitNum, skip });
      
      // 先測試簡單查詢
      const orders = await this.prisma.order.findMany({
        where,
        include: {
          member: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true } },
          installments: true,
        },
        skip,
        take: limitNum,
        orderBy,
      });
      
      const total = await this.prisma.order.count({ where });

      console.log('🔍 Query results:', { ordersCount: orders.length, total });

      return {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      console.error('❌ Error in getOrders:', error);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  /** ✅ 新增：彙總統計，不分頁、不排序（但沿用所有篩選） */
  async getOrdersSummary(query: GetOrdersQuery, userRole: string, userBranchId?: string) {
    try {
      console.log('🔍 getOrdersSummary called with:', { query, userRole, userBranchId });
      
      // 使用共用的 where 構建邏輯
      const where = this.buildWhere(query, userRole, userBranchId);
      
      console.log('🔍 Summary where condition:', JSON.stringify(where, null, 2));

      const [totalCount, pendingCount, completedCount, cancelledCount, totalRevenue] =
        await this.prisma.$transaction([
          this.prisma.order.count({ where }),
          this.prisma.order.count({ where: { ...where, status: 'PENDING' } }),
          this.prisma.order.count({ where: { ...where, status: 'COMPLETED' } }),
          this.prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
          this.prisma.order.aggregate({
            where: { ...where, status: 'COMPLETED' },
            _sum: { totalAmount: true },
          }),
        ]);

      console.log('🔍 Summary results:', { 
        totalCount, 
        pendingCount, 
        completedCount, 
        cancelledCount, 
        totalRevenue: totalRevenue._sum.totalAmount 
      });

      return {
        totalCount,
        pendingCount,
        completedCount,
        cancelledCount,
        totalRevenue: Number(totalRevenue._sum.totalAmount || 0), // Decimal 轉 number
      };
    } catch (error) {
      console.error('❌ Error in getOrdersSummary:', error);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  async myOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { memberId: userId },
      include: {
        member: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
        installments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        member: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
        installments: true,
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status: status as any },
      include: {
        member: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
        installments: true,
      },
    });
  }
}



