import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface GetOrdersQuery {
  branchId?: string;
  status?: string;
  page?: number;
  limit?: number;
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
    const { branchId, status, page = 1, limit = 10 } = query;
    
    // 構建 where 條件
    const where: any = {};
    
    // 如果不是 BOSS，只能查看自己分店的訂單
    if (userRole !== 'BOSS') {
      where.branchId = userBranchId;
    } else if (branchId) {
      // BOSS 可以指定分店查看
      where.branchId = branchId;
    }
    
    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;
    
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          member: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true } },
          installments: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
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



