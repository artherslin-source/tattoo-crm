import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface UpdateUserDto {
  name?: string;
  phone?: string;
  avatarUrl?: string;
}

interface GetUsersQuery {
  branchId?: string;
  role?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        },
        totalSpent: true,
        storedValueTotal: true,
        storedValueBalance: true,
        createdAt: true,
        lastLogin: true,
        status: true,
      },
    });
  }

  async getUsers(query: GetUsersQuery, userRole: string, userBranchId?: string) {
    const { branchId, role, page = 1, limit = 10 } = query;
    
    // 構建 where 條件
    const where: any = {};
    
    // 如果不是 BOSS，只能查看自己分店的用戶
    if (userRole !== 'BOSS') {
      where.branchId = userBranchId;
    } else if (branchId) {
      // BOSS 可以指定分店查看
      where.branchId = branchId;
    }
    
    if (role) {
      where.role = role;
    }

    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          branchId: true,
          branch: {
            select: {
              id: true,
              name: true,
            }
          },
          totalSpent: true,
          storedValueTotal: true,
          storedValueBalance: true,
          createdAt: true,
          lastLogin: true,
          status: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateMe(userId: string, updateUserDto: UpdateUserDto) {
    const updateData: any = {};
    if (updateUserDto.name !== undefined) updateData.name = updateUserDto.name;
    if (updateUserDto.phone !== undefined) updateData.phone = updateUserDto.phone;
    if (updateUserDto.avatarUrl !== undefined) updateData.avatarUrl = updateUserDto.avatarUrl;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        branchId: true,
        createdAt: true,
        lastLogin: true,
        status: true,
      },
    });

    return updatedUser;
  }

  // 財務相關方法
  async updateUserFinancials(userId: string, updates: {
    totalSpent?: number;
    storedValueTotal?: number;
    storedValueBalance?: number;
  }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        email: true,
        name: true,
        totalSpent: true,
        storedValueTotal: true,
        storedValueBalance: true,
      },
    });
  }

  async addTopUp(userId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { storedValueTotal: true, storedValueBalance: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          storedValueTotal: { increment: amount },
          storedValueBalance: { increment: amount },
        },
        select: {
          id: true,
          email: true,
          name: true,
          totalSpent: true,
          storedValueTotal: true,
          storedValueBalance: true,
        },
      });
    });
  }

  async processPayment(userId: string, amount: number, useStoredValue: boolean = false) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { storedValueBalance: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (useStoredValue && user.storedValueBalance < amount) {
        throw new Error('Insufficient stored value balance');
      }

      const updateData: any = {
        totalSpent: { increment: amount },
      };

      if (useStoredValue) {
        updateData.storedValueBalance = { decrement: amount };
      }

      return tx.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          totalSpent: true,
          storedValueTotal: true,
          storedValueBalance: true,
        },
      });
    });
  }
}



