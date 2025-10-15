import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminMembersService {
  constructor(private readonly prisma: PrismaService) {
    console.log('🏗️ AdminMembersService constructor called');
  }

  async findAll(filters?: {
    search?: string;
    role?: string;
    status?: string;
    branchId?: string;
    membershipLevel?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
  }) {
    try {
      // 建立篩選條件
      const where: any = {};
      const userWhere: any = {};

      // 搜尋條件
      if (filters?.search) {
        where.OR = [
          { user: { name: { contains: filters.search, mode: 'insensitive' } } },
          { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        ];
      }
      
      // 角色篩選
      if (filters?.role && filters.role !== 'all') {
        userWhere.role = filters.role;
      }
      
      // 狀態篩選
      if (filters?.status && filters.status !== 'all') {
        userWhere.status = filters.status;
      }
      
      // 分店篩選
      if (filters?.branchId && filters.branchId !== 'all') {
        userWhere.branchId = filters.branchId;
      }
      
      // 會員等級篩選
      if (filters?.membershipLevel && filters.membershipLevel !== 'all') {
        where.membershipLevel = filters.membershipLevel;
      }
      
      // 如果有 user 相關的篩選條件，添加到 where 中
      if (Object.keys(userWhere).length > 0) {
        where.user = userWhere;
      }

      console.log('🔍 Filter conditions:', JSON.stringify(where, null, 2));

      // 建立排序條件
      let orderBy: any[] = [];
      
      console.log('🔍 Sort filters:', { sortField: filters?.sortField, sortOrder: filters?.sortOrder });
      
      if (filters?.sortField && filters?.sortOrder) {
        // 根據前端傳來的排序欄位和順序
        switch (filters.sortField) {
          case 'name':
            orderBy.push({ user: { name: filters.sortOrder } });
            break;
          case 'email':
            orderBy.push({ user: { email: filters.sortOrder } });
            break;
          case 'branch':
            orderBy.push({ user: { branch: { name: filters.sortOrder } } });
            break;
          case 'role':
            orderBy.push({ user: { role: filters.sortOrder } });
            break;
          case 'totalSpent':
            orderBy.push({ totalSpent: filters.sortOrder });
            break;
          case 'membershipLevel':
            orderBy.push({ membershipLevel: filters.sortOrder });
            break;
          case 'balance':
            orderBy.push({ balance: filters.sortOrder });
            break;
          case 'createdAt':
            orderBy.push({ user: { createdAt: filters.sortOrder } });
            break;
          default:
            // 預設排序：註冊時間降序（最新在前）
            orderBy.push({ user: { createdAt: 'desc' } });
        }
      } else {
        // 預設排序：註冊時間降序（最新在前）
        orderBy.push({ user: { createdAt: 'desc' } });
      }
      
      // 添加次要排序條件（確保排序穩定）
      orderBy.push({ id: 'desc' });

      console.log('🔍 Final orderBy:', JSON.stringify(orderBy, null, 2));

      const rawPage = filters?.page ?? 1;
      const rawPageSize = filters?.pageSize ?? 10;
      const pageSize = Math.min(Math.max(Number(rawPageSize) || 10, 1), 100);

      const totalMembers = await this.prisma.member.count({ where });
      const totalPages = Math.max(1, Math.ceil(totalMembers / pageSize));
      const page = Math.min(Math.max(Number(rawPage) || 1, 1), totalPages);
      const skip = (page - 1) * pageSize;

      const membersPromise = this.prisma.member.findMany({
        where,
        include: {
          user: {
            include: {
              branch: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy,
        skip,
        take: pageSize,
      });

      const userFiltersWithoutRole = { ...(where.user ?? {}) };
      delete userFiltersWithoutRole.role;

      let adminCountPromise: Promise<number> | null = null;
      let regularMemberCountPromise: Promise<number> | null = null;

      if (!filters?.role || filters.role === 'all') {
        adminCountPromise = this.prisma.member.count({
          where: {
            ...where,
            user: {
              ...userFiltersWithoutRole,
              role: 'ADMIN',
            },
          },
        });

        regularMemberCountPromise = this.prisma.member.count({
          where: {
            ...where,
            user: {
              ...userFiltersWithoutRole,
              role: 'MEMBER',
            },
          },
        });
      }

      const members = await membersPromise;

      let adminCount = 0;
      let regularMemberCount = 0;

      if (filters?.role === 'ADMIN') {
        adminCount = totalMembers;
      } else if (filters?.role === 'MEMBER') {
        regularMemberCount = totalMembers;
      } else {
        [adminCount, regularMemberCount] = await Promise.all([
          adminCountPromise ?? Promise.resolve(0),
          regularMemberCountPromise ?? Promise.resolve(0),
        ]);
      }

      console.log('DEBUG members (paginated):', JSON.stringify({ page, pageSize, totalMembers, items: members.length }, null, 2));

      return {
        data: members,
        total: totalMembers,
        page,
        pageSize,
        stats: {
          totalMembers,
          adminCount,
          memberCount: regularMemberCount,
        }
      };
    } catch (error) {
      console.error('ERROR in findAll members:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundException('會員不存在');
    }

    // 取得會員的預約紀錄
    const appointments = await this.prisma.appointment.findMany({
      where: { userId: member.userId },
      include: {
        service: { select: { name: true, price: true } },
        artist: { select: { name: true } },
      },
      orderBy: { startAt: 'desc' },
    });

    // 取得會員的訂單紀錄
    const orders = await this.prisma.order.findMany({
      where: { memberId: member.userId },
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
      where: { id },
      include: { user: true }
    });
    if (!member) {
      throw new NotFoundException('會員不存在');
    }

    return this.prisma.user.update({
      where: { id: member.userId },
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
      where: { id },
      include: { user: true }
    });
    if (!member) {
      throw new NotFoundException('會員不存在');
    }

    return this.prisma.user.update({
      where: { id: member.userId },
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
      where: { id },
      include: { user: true }
    });
    if (!member) {
      throw new NotFoundException('會員不存在');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    return this.prisma.user.update({
      where: { id: member.userId },
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
    branchId?: string;
    role?: 'MEMBER' | 'ADMIN';
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
          role: data.role || 'MEMBER',
          branchId: data.branchId,
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
              branch: {
                select: {
                  id: true,
                  name: true,
                }
              }
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
        where: { id },
        include: { user: true }
      });

      if (!member) {
        throw new NotFoundException('會員不存在');
      }

      // 更新 User
      if (data.name || data.email || data.phone) {
        await tx.user.update({
          where: { id: member.userId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.email && { email: data.email }),
            ...(data.phone && { phone: data.phone }),
          },
        });
      }

      // 更新 Member
      const updatedMember = await tx.member.update({
        where: { id },
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
        where: { id },
        include: { user: true }
      });

      if (!member) {
        throw new NotFoundException('會員不存在');
      }

      // 刪除 Member
      await tx.member.delete({
        where: { id },
      });

      // 刪除 User
      await tx.user.delete({
        where: { id: member.userId },
      });

      return { message: '會員已刪除' };
    });
  }

  async topupUser(memberId: string, amount: number, operatorId: string) {
    try {
      console.log('💰 topupUser called with:', { memberId, amount, operatorId });
      
      // 如果沒有 operatorId，使用預設的管理員 ID
      const finalOperatorId = operatorId || "cmg3lv56u0000sb7u0sx3wmwk";
      
      return await this.prisma.$transaction(async (tx) => {
        // 先檢查會員是否存在
        const existingMember = await tx.member.findUnique({
          where: { id: memberId },
        });

        if (!existingMember) {
          throw new NotFoundException(`會員不存在: ${memberId}`);
        }

        console.log('💰 Found member:', existingMember);

        const member = await tx.member.update({
          where: { id: memberId },
          data: { balance: { increment: amount } },
        });

        console.log('💰 Updated member balance:', member);

        await tx.topupHistory.create({
          data: {
            memberId,
            operatorId: finalOperatorId,
            amount,
            type: 'TOPUP',
          },
        });

        console.log('💰 Created topup history');

        return member;
      });
    } catch (error) {
      console.error('💰 topupUser error:', error);
      throw error;
    }
  }

  async getTopupHistory(id: string) {
    console.log('🔍 getTopupHistory called with id:', id);
    const result = await this.prisma.topupHistory.findMany({
      where: { memberId: id },
      include: {
        operator: {
          select: {
            id: true,
            email: true,
            name: true,   // ✅ 確保回傳 name
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log('🔍 getTopupHistory result:', JSON.stringify(result, null, 2));
    return result;
  }

  async spend(memberId: string, amount: number, operatorId: string) {
    try {
      console.log('💸 spend called with:', { memberId, amount, operatorId });
      
      if (amount <= 0) {
        throw new BadRequestException('消費金額必須大於 0');
      }

      // 如果沒有 operatorId，使用預設的管理員 ID
      const finalOperatorId = operatorId || "cmg3lv56u0000sb7u0sx3wmwk";

      return await this.prisma.$transaction(async (tx) => {
        // 檢查會員餘額是否足夠
        const member = await tx.member.findUnique({
          where: { id: memberId },
        });

        if (!member) {
          throw new NotFoundException(`會員不存在: ${memberId}`);
        }

        console.log('💸 Found member:', member);

        if (member.balance < amount) {
          throw new BadRequestException(`餘額不足，無法完成消費。當前餘額: ${member.balance}, 消費金額: ${amount}`);
        }

        // 扣減餘額
        const updatedMember = await tx.member.update({
          where: { id: memberId },
          data: { 
            balance: { decrement: amount },
            totalSpent: { increment: amount }  // 同時增加累計消費
          },
        });

        console.log('💸 Updated member after spend:', updatedMember);

        // 記錄消費歷史
        await tx.topupHistory.create({
          data: {
            memberId,
            operatorId: finalOperatorId,
            amount,
            type: 'SPEND',
          },
        });

        console.log('💸 Created spend history');

        return updatedMember;
      });
    } catch (error) {
      console.error('💸 spend error:', error);
      throw error;
    }
  }
}
