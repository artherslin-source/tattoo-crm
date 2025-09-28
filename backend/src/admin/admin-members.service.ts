import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { search?: string; role?: string; status?: string }) {
    console.log('AdminMembersService.findAll called with filters:', filters);
    
    const where: any = {};

    // 構建 user 條件
    const userConditions: any = {};
    
    if (filters?.search) {
      userConditions.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.role) {
      userConditions.role = filters.role;
    }

    if (filters?.status) {
      userConditions.status = filters.status;
    }

    // 只有在有條件時才設置 where.user
    if (Object.keys(userConditions).length > 0) {
      where.user = userConditions;
    }

    console.log('AdminMembersService.findAll where clause:', where);

    const result = await this.prisma.member.findMany({
      where,
      select: {
        id: true,
        totalSpent: true,
        balance: true,
        membershipLevel: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          }
        },
      },
      orderBy: { id: 'desc' },
    });

    console.log('AdminMembersService.findAll result:', result.length, 'records');
    return result;
  }

  async findOne(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        totalSpent: true,
        balance: true,
        membershipLevel: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          }
        },
      },
    });

    if (!member) {
      throw new NotFoundException('會員不存在');
    }

    // 取得會員的預約紀錄
    const appointments = await this.prisma.appointment.findMany({
      where: { userId: member.user.id },
      include: {
        service: { select: { name: true, price: true } },
        artist: { select: { name: true } },
      },
      orderBy: { startAt: 'desc' },
    });

    // 取得會員的訂單紀錄
    const orders = await this.prisma.order.findMany({
      where: { memberId: member.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...member,
      appointments,
      orders,
    };
  }

  async updateRole(id: string, role: string) {
    if (!['MEMBER', 'ADMIN'].includes(role)) {
      throw new BadRequestException('無效的角色');
    }

    const member = await this.prisma.member.findUnique({ 
      where: { id: parseInt(id) },
      include: { user: true }
    });
    if (!member) {
      throw new NotFoundException('會員不存在');
    }

    return this.prisma.user.update({
      where: { id: member.user.id },
      data: { role: role as any },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
  }

  async updateStatus(id: string, status: string) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new BadRequestException('無效的狀態');
    }

    const member = await this.prisma.member.findUnique({ 
      where: { id: parseInt(id) },
      include: { user: true }
    });
    if (!member) {
      throw new NotFoundException('會員不存在');
    }

    return this.prisma.user.update({
      where: { id: member.user.id },
      data: { status: status as any },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
  }

  async resetPassword(id: string, password: string) {
    if (!password || password.length < 8) {
      throw new BadRequestException('密碼長度至少需要 8 個字符');
    }

    const member = await this.prisma.member.findUnique({ 
      where: { id: parseInt(id) },
      include: { user: true }
    });
    if (!member) {
      throw new NotFoundException('會員不存在');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    return this.prisma.user.update({
      where: { id: member.user.id },
      data: { hashedPassword },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
  }

  async createMember(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    totalSpent?: number;
    balance?: number;
    membershipLevel?: string;
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 12);

    return this.prisma.$transaction(async (tx) => {
      // 創建 User
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          hashedPassword,
          phone: data.phone,
          role: 'MEMBER',
        },
      });

      // 創建 Member
      const member = await tx.member.create({
        data: {
          userId: user.id,
          totalSpent: data.totalSpent || 0,
          balance: data.balance || 0,
          membershipLevel: data.membershipLevel,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              status: true,
              createdAt: true,
            }
          }
        },
      });

      return member;
    });
  }

  async updateMember(id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    totalSpent?: number;
    balance?: number;
    membershipLevel?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.findUnique({
        where: { id: parseInt(id) },
        include: { user: true }
      });

      if (!member) {
        throw new NotFoundException('會員不存在');
      }

      // 更新 User
      if (data.name || data.email || data.phone) {
        await tx.user.update({
          where: { id: member.user.id },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.email && { email: data.email }),
            ...(data.phone && { phone: data.phone }),
          },
        });
      }

      // 更新 Member
      const updatedMember = await tx.member.update({
        where: { id: parseInt(id) },
        data: {
          ...(data.totalSpent !== undefined && { totalSpent: data.totalSpent }),
          ...(data.balance !== undefined && { balance: data.balance }),
          ...(data.membershipLevel && { membershipLevel: data.membershipLevel }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              status: true,
              createdAt: true,
            }
          }
        },
      });

      return updatedMember;
    });
  }

  async deleteMember(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.findUnique({
        where: { id: parseInt(id) },
        include: { user: true }
      });

      if (!member) {
        throw new NotFoundException('會員不存在');
      }

      // 刪除 Member
      await tx.member.delete({
        where: { id: parseInt(id) },
      });

      // 刪除 User
      await tx.user.delete({
        where: { id: member.user.id },
      });

      return { message: '會員已刪除' };
    });
  }
}
