import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface GetOrdersQuery {
  branchId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: { memberId: string; branchId: string; appointmentId?: string | null; totalAmount: number; paymentType: 'ONE_TIME' | 'INSTALLMENT' }) {
    return this.prisma.order.create({ 
      data: input,
      include: {
        member: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
        installments: true,
      },
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



