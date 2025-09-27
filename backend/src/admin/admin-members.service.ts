import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { search?: string; role?: string; status?: string }) {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        totalSpent: true,
        storedValueTotal: true,
        storedValueBalance: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        totalSpent: true,
        storedValueTotal: true,
        storedValueBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('會員不存在');
    }

    // 取得會員的預約紀錄
    const appointments = await this.prisma.appointment.findMany({
      where: { userId: id },
      include: {
        service: { select: { name: true, price: true } },
        artist: { select: { name: true } },
      },
      orderBy: { startAt: 'desc' },
    });

    // 取得會員的訂單紀錄
    const orders = await this.prisma.order.findMany({
      where: { memberId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...user,
      appointments,
      orders,
    };
  }

  async updateRole(id: string, role: string) {
    if (!['MEMBER', 'ADMIN'].includes(role)) {
      throw new BadRequestException('無效的角色');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('會員不存在');
    }

    return this.prisma.user.update({
      where: { id },
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

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('會員不存在');
    }

    return this.prisma.user.update({
      where: { id },
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

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('會員不存在');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    return this.prisma.user.update({
      where: { id },
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
}
