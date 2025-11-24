import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';

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
  useStoredValue?: boolean;
  notes?: string;
}

interface CheckoutInput {
  paymentType: 'ONE_TIME' | 'INSTALLMENT';
  installmentTerms?: number;
  startDate?: Date;
  customPlan?: { [key: string]: number };
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

  /** 根據累計消費金額計算會員等級 */
  private calculateMembershipLevel(totalSpent: number): string {
    if (totalSpent >= 100000) {
      return '鑽石會員';
    } else if (totalSpent >= 50000) {
      return '白金會員';
    } else if (totalSpent >= 20000) {
      return '黃金會員';
    } else if (totalSpent >= 10000) {
      return '銀級會員';
    } else if (totalSpent >= 5000) {
      return '銅級會員';
    } else {
      return '一般會員';
    }
  }

  /** 更新會員等級 */
  private async updateMembershipLevel(tx: any, userId: string, totalSpent: number) {
    const membershipLevel = this.calculateMembershipLevel(totalSpent);
    
    await tx.member.update({
      where: { userId },
      data: { membershipLevel },
    });

    console.log('🎯 會員等級更新:', {
      userId,
      totalSpent,
      membershipLevel
    });
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
          finalAmount: input.totalAmount,
          status: 'PENDING_PAYMENT', // 新建訂單預設為待結帳狀態
          paymentType: 'ONE_TIME', // 預設為一次付清，結帳時再決定
          isInstallment: false,
          notes: input.notes || null,
        },
        include: {
          member: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true } },
          installments: true,
        },
      });

      // 新建訂單時不更新會員累計消費，等到結帳時才處理
      // 確保用戶有 Member 記錄
      const member = await tx.member.findUnique({
        where: { userId: input.memberId },
      });

      if (!member) {
        await tx.member.create({
          data: {
            userId: input.memberId,
            totalSpent: 0,
            balance: 0,
            membershipLevel: 'BRONZE',
          },
        });
        
        console.log('🎯 新會員創建:', {
          userId: input.memberId,
          totalSpent: 0,
          membershipLevel: 'BRONZE'
        });
      }

      return order;
    });
  }

  async checkout(orderId: string, input: CheckoutInput) {
    return await this.prisma.$transaction(async (tx) => {
      // 檢查訂單是否存在且狀態為 PENDING_PAYMENT
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { installments: true }
      });

      if (!order) {
        throw new Error('訂單不存在');
      }

      if (order.status !== 'PENDING_PAYMENT') {
        throw new Error('訂單狀態不正確，無法結帳');
      }

      if (input.paymentType === 'ONE_TIME') {
        // 一次付清
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
            paymentType: 'ONE_TIME',
            paidAt: new Date(),
            isInstallment: false
          }
        });

        // 更新會員累計消費
        await this.updateMemberTotalSpent(tx, order.memberId, order.finalAmount);

        return { message: '訂單已標記為已付款' };
      } else {
        // 分期付款
        const installmentCount = input.installmentTerms || 3;
        const startDate = input.startDate || new Date();
        const totalAmount = order.finalAmount;

        // 刪除現有的分期付款記錄（如果有的話）
        if (order.installments.length > 0) {
          await tx.installment.deleteMany({
            where: { orderId }
          });
        }

        // 創建分期付款記錄
        const installments: any[] = [];
        const customPlan = input.customPlan || {};

        // 計算自定義金額的總和
        const customTotal = Object.values(customPlan).reduce((sum, amount) => sum + amount, 0);
        const remainingAmount = totalAmount - customTotal;
        const nonCustomCount = installmentCount - Object.keys(customPlan).length;

        // 計算非自定義期數的平均金額
        const baseAmount = nonCustomCount > 0 ? Math.floor(remainingAmount / nonCustomCount) : 0;
        const remainder = nonCustomCount > 0 ? remainingAmount - (baseAmount * nonCustomCount) : 0;
        let nonCustomIndex = 0;

        for (let i = 1; i <= installmentCount; i++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i - 1);

          let amount: number;
          let isCustom = false;

          if (customPlan[i.toString()]) {
            // 使用自定義金額
            amount = customPlan[i.toString()];
            isCustom = true;
          } else {
            // 計算剩餘金額的平均分配
            nonCustomIndex++;
            amount = baseAmount;
            // 最後一個非自定義期數吸收尾差
            if (nonCustomIndex === nonCustomCount && remainder > 0) {
              amount += remainder;
            }
          }

          const installment = await tx.installment.create({
            data: {
              orderId,
              installmentNo: i,
              dueDate,
              amount,
              status: 'UNPAID',
              isCustom,
              autoAdjusted: !isCustom
            }
          });

          installments.push(installment);
        }

        // 更新訂單狀態
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'INSTALLMENT_ACTIVE',
            paymentType: 'INSTALLMENT',
            isInstallment: true
          }
        });

        return {
          message: '分期付款計劃已創建',
          installments
        };
      }
    });
  }

  private async updateMemberTotalSpent(tx: any, userId: string, amount: number) {
    const member = await tx.member.findUnique({
      where: { userId }
    });

    if (!member) {
      // 如果沒有 Member 記錄，創建一個
      await tx.member.create({
        data: {
          userId,
          totalSpent: amount,
          balance: 0,
          membershipLevel: this.calculateMembershipLevel(amount),
        },
      });
    } else {
      // 更新現有的 Member 記錄
      const newTotalSpent = member.totalSpent + amount;
      await tx.member.update({
        where: { userId },
        data: {
          totalSpent: newTotalSpent,
          membershipLevel: this.calculateMembershipLevel(newTotalSpent),
        },
      });
    }
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
          member: { select: { id: true, name: true, phone: true } },
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

      const paidStatuses: OrderStatus[] = [
        'PAID',
        'PAID_COMPLETE',
        'INSTALLMENT_ACTIVE',
        'PARTIALLY_PAID',
        'COMPLETED'
      ];

      // ✅ 待處理狀態：所有未完成的訂單（不包括已完成和已取消）
      const pendingStatuses: OrderStatus[] = [
        'PENDING_PAYMENT',  // 待結帳
        'INSTALLMENT_ACTIVE', // 分期中
        'PARTIALLY_PAID',   // 部分付款
        'PAID'              // 已付款（但還未完成服務）
      ];

      const [totalCount, pendingCount, completedCount, cancelledCount] =
        await this.prisma.$transaction([
          this.prisma.order.count({ where }),
          this.prisma.order.count({ where: { ...where, status: { in: pendingStatuses } } }),
          this.prisma.order.count({ where: { ...where, status: 'COMPLETED' } }),
          this.prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
        ]);

      // ✅ 修正：計算總營收 = 一次付清訂單的 finalAmount + 分期訂單中已付款的分期金額
      // 1. 計算一次付清且已付款的訂單
      const oneTimeRevenue = await this.prisma.order.aggregate({
        where: {
          ...where,
          paymentType: 'ONE_TIME',
          status: { in: paidStatuses }
        },
        _sum: { finalAmount: true }
      });

      // 2. 計算分期訂單中已付款的分期金額
      const installmentRevenue = await this.prisma.installment.aggregate({
        where: {
          status: 'PAID',
          order: where
        },
        _sum: { amount: true }
      });

      const totalRevenueAmount = 
        Number(oneTimeRevenue._sum.finalAmount || 0) + 
        Number(installmentRevenue._sum.amount || 0);

      console.log('🔍 Summary results:', {
        totalCount,
        pendingCount,
        completedCount,
        cancelledCount,
        oneTimeRevenue: oneTimeRevenue._sum.finalAmount,
        installmentRevenue: installmentRevenue._sum.amount,
        totalRevenue: totalRevenueAmount
      });

      return {
        totalCount,
        pendingCount,
        completedCount,
        cancelledCount,
        totalRevenue: totalRevenueAmount,
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



