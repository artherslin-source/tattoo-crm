import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { isBoss, type AccessActor } from '../common/access/access.types';
import { BillingService } from '../billing/billing.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly audit: AuditService,
  ) {
    console.log('🏗️ AdminMembersService constructor called');
  }

  async findAll(filters?: {
    actor: AccessActor;
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

      // Scope rules:
      // - BOSS: can view all
      // - ARTIST: assignment-first (primaryArtistId=actor.id), fallback to history if no assignments exist
      if (!filters?.actor) throw new BadRequestException('actor is required');
      if (!isBoss(filters.actor)) {
        // Check if there are any assigned members for this artist
        const hasAssignedMembers = await this.prisma.user.count({
          where: {
            role: 'MEMBER',
            branchId: filters.actor.branchId,
            primaryArtistId: filters.actor.id,
          },
        });

        if (hasAssignedMembers > 0) {
          // Has assignments: use assignment-based scoping
          userWhere.branchId = filters.actor.branchId;
          userWhere.primaryArtistId = filters.actor.id;
          userWhere.role = 'MEMBER';
        } else {
          // No assignments: fallback to history-based scoping
          userWhere.branchId = filters.actor.branchId;
          userWhere.role = 'MEMBER';
          userWhere.OR = [
            { appointments: { some: { artistId: filters.actor.id } } },
            { completedServicesAsCustomer: { some: { artistId: filters.actor.id } } },
            { appointmentBillsAsCustomer: { some: { artistId: filters.actor.id } } },
          ];
        }
      }

      // 搜尋條件
      if (filters?.search) {
        where.OR = [
          { user: { name: { contains: filters.search, mode: 'insensitive' } } },
          { user: { email: { contains: filters.search, mode: 'insensitive' } } },
          { user: { phone: { contains: filters.search, mode: 'insensitive' } } },
        ];
      }
      
      // 角色篩選
      if (filters?.role && filters.role !== 'all') {
        // Prevent ARTIST from broadening scope
        if (isBoss(filters.actor)) {
          userWhere.role = filters.role;
        }
      }
      
      // 狀態篩選
      if (filters?.status && filters.status !== 'all') {
        userWhere.status = filters.status;
      }
      
      // 分店篩選
      if (filters?.branchId && filters.branchId !== 'all') {
        if (isBoss(filters.actor)) {
          userWhere.branchId = filters.branchId;
        }
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

  async locatePage(filters: {
    actor: AccessActor;
    userId: string;
    search?: string;
    role?: string;
    status?: string;
    branchId?: string;
    membershipLevel?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    pageSize?: number;
  }) {
    // Reuse the same filtering + ordering logic as findAll, but compute which page contains the userId.
    const where: any = {};
    const userWhere: any = {};

    if (!filters?.actor) throw new BadRequestException('actor is required');

    // Scope rules (keep identical to findAll)
    if (!isBoss(filters.actor)) {
      const hasAssignedMembers = await this.prisma.user.count({
        where: {
          role: 'MEMBER',
          branchId: filters.actor.branchId,
          primaryArtistId: filters.actor.id,
        },
      });

      if (hasAssignedMembers > 0) {
        userWhere.branchId = filters.actor.branchId;
        userWhere.primaryArtistId = filters.actor.id;
        userWhere.role = 'MEMBER';
      } else {
        userWhere.branchId = filters.actor.branchId;
        userWhere.role = 'MEMBER';
        userWhere.OR = [
          { appointments: { some: { artistId: filters.actor.id } } },
          { completedServicesAsCustomer: { some: { artistId: filters.actor.id } } },
          { appointmentBillsAsCustomer: { some: { artistId: filters.actor.id } } },
        ];
      }
    }

    if (filters.search) {
      where.OR = [
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { user: { phone: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    if (filters.role && filters.role !== 'all') {
      if (isBoss(filters.actor)) {
        userWhere.role = filters.role;
      }
    }

    if (filters.status && filters.status !== 'all') {
      userWhere.status = filters.status;
    }

    if (filters.branchId && filters.branchId !== 'all') {
      if (isBoss(filters.actor)) {
        userWhere.branchId = filters.branchId;
      }
    }

    if (filters.membershipLevel && filters.membershipLevel !== 'all') {
      where.membershipLevel = filters.membershipLevel;
    }

    if (Object.keys(userWhere).length > 0) {
      where.user = userWhere;
    }

    // Build orderBy (keep identical to findAll)
    const orderBy: any[] = [];
    if (filters.sortField && filters.sortOrder) {
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
          orderBy.push({ user: { createdAt: 'desc' } });
      }
    } else {
      orderBy.push({ user: { createdAt: 'desc' } });
    }
    orderBy.push({ id: 'desc' });

    const rawPageSize = filters.pageSize ?? 10;
    const pageSize = Math.min(Math.max(Number(rawPageSize) || 10, 1), 100);

    // If the target user isn't visible under current scope/filters, return found=false
    const target = await this.prisma.member.findFirst({
      where: { ...where, userId: filters.userId },
      select: { id: true },
    });
    if (!target) {
      return { found: false as const };
    }

    const total = await this.prisma.member.count({ where });
    const batchSize = 1000;
    for (let offset = 0; offset < total; offset += batchSize) {
      const batch = await this.prisma.member.findMany({
        where,
        orderBy,
        skip: offset,
        take: batchSize,
        select: { userId: true },
      });
      const idx = batch.findIndex((r) => r.userId === filters.userId);
      if (idx >= 0) {
        const absoluteIndex = offset + idx; // 0-based
        const page = Math.floor(absoluteIndex / pageSize) + 1;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        return { found: true as const, page, total, pageSize, totalPages };
      }
    }

    // Fallback (shouldn't happen): treat as not found
    return { found: false as const };
  }

  async findOne(actor: AccessActor, id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundException('會員不存在');
    }

    if (!isBoss(actor)) {
      if (member.user.branchId !== actor.branchId) throw new ForbiddenException('Insufficient permissions');
      if (member.user.primaryArtistId !== actor.id) throw new ForbiddenException('Insufficient permissions');
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

    // 取得會員的帳務紀錄（Billing v3 單一口徑）
    const bills = await this.prisma.appointmentBill.findMany({
      where: { customerId: member.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: { select: { id: true, startAt: true, status: true } },
        branch: { select: { id: true, name: true } },
        artist: { select: { id: true, name: true } },
        payments: { select: { amount: true, paidAt: true, method: true } },
      },
      take: 50,
    });

    const customerNotes = await this.prisma.customerNote.findMany({
      where: { customerId: member.userId },
      include: { creator: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const historyServices = await this.prisma.completedService.findMany({
      where: { customerId: member.userId },
      select: { id: true, serviceName: true, servicePrice: true, completedAt: true, artistId: true, branchId: true },
      orderBy: { completedAt: 'desc' },
      take: 50,
    });

    return {
      ...member,
      appointments,
      bills,
      customerNotes,
      historyServices,
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
        phone: true,
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
        phone: true,
        role: true,
        status: true,
      },
    });
  }

  async resetPassword(actor: AccessActor, id: string, password: string) {
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

    const updated = await this.prisma.user.update({
      where: { id: member.userId },
      data: { hashedPassword },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
      },
    });

    await this.audit.log({
      actor,
      action: 'MEMBER_RESET_PASSWORD',
      entityType: 'MEMBER',
      entityId: id,
      metadata: { memberId: id, userId: member.userId },
    });

    return updated;
  }

  async createMember(actor: AccessActor, data: {
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

    // Normalize + validate branchId (avoid FK violations)
    const rawBranchId = (isBoss(actor) ? data.branchId : (actor.branchId ?? data.branchId)) ?? undefined;
    const branchId = rawBranchId && rawBranchId.trim().length > 0 ? rawBranchId.trim() : undefined;

    if (branchId) {
      const exists = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
      if (!exists) {
        throw new BadRequestException('分店不存在，請重新選擇分店');
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      // 創建 User
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          hashedPassword,
          phone: data.phone,
          role: data.role || 'MEMBER',
          branchId,
          primaryArtistId: isBoss(actor) ? undefined : actor.id,
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

    await this.audit.log({
      actor,
      action: 'MEMBER_CREATE',
      entityType: 'MEMBER',
      entityId: created.id,
      metadata: { memberId: created.id, userId: created.userId },
    });

    return created;
  }

  async setPrimaryArtist(actor: AccessActor, memberId: string, primaryArtistId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: { user: true },
    });
    if (!member) throw new NotFoundException('會員不存在');

    if (!isBoss(actor)) {
      // ARTIST can only assign customers in their branch to themselves
      if (primaryArtistId !== actor.id) throw new ForbiddenException('ARTIST can only assign customers to themselves');
      if (member.user.branchId !== actor.branchId) throw new ForbiddenException('Cannot modify customer outside your branch');
    }

    await this.prisma.user.update({
      where: { id: member.userId },
      data: { primaryArtistId },
    });

    await this.audit.log({
      actor,
      action: 'MEMBER_SET_PRIMARY_ARTIST',
      entityType: 'MEMBER',
      entityId: memberId,
      diff: {
        'user.primaryArtistId': { from: member.user.primaryArtistId ?? null, to: primaryArtistId },
      },
      metadata: { memberId, userId: member.userId },
    });

    return { success: true };
  }

  async updateMember(actor: AccessActor, id: string, data: {
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
              phone: true,
              role: true,
              status: true,
              createdAt: true,
            }
          }
        },
      });

      const diff: Record<string, { from: unknown; to: unknown }> = {};
      if (data.name !== undefined && data.name !== member.user.name) diff['user.name'] = { from: member.user.name ?? null, to: data.name };
      if (data.email !== undefined && data.email !== member.user.email) diff['user.email'] = { from: member.user.email ?? null, to: data.email };
      if (data.phone !== undefined && data.phone !== member.user.phone) diff['user.phone'] = { from: member.user.phone ?? null, to: data.phone };
      if (data.totalSpent !== undefined && data.totalSpent !== member.totalSpent) diff['member.totalSpent'] = { from: member.totalSpent, to: data.totalSpent };
      if (data.balance !== undefined && data.balance !== member.balance) diff['member.balance'] = { from: member.balance, to: data.balance };
      if (data.membershipLevel !== undefined && data.membershipLevel !== member.membershipLevel) diff['member.membershipLevel'] = { from: member.membershipLevel ?? null, to: data.membershipLevel ?? null };

      await this.audit.log({
        actor,
        action: 'MEMBER_UPDATE',
        entityType: 'MEMBER',
        entityId: id,
        diff: Object.keys(diff).length ? diff : null,
        metadata: { memberId: id, userId: member.userId },
      });

      return updatedMember;
    });
  }

  async deleteMember(actor: AccessActor, id: string) {
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

      await this.audit.log({
        actor,
        action: 'MEMBER_DELETE',
        entityType: 'MEMBER',
        entityId: id,
        metadata: { memberId: id, userId: member.userId },
      });

      return { message: '會員已刪除' };
    });
  }

  async topupUser(
    actor: AccessActor,
    memberId: string,
    input: { amount: number; method?: string; notes?: string },
    operatorId: string,
  ) {
    try {
      console.log('💰 topupUser called with:', { memberId, input, operatorId, actor });
      
      // 如果沒有 operatorId，使用預設的管理員 ID
      const finalOperatorId = operatorId || "cmg3lv56u0000sb7u0sx3wmwk";
      
      // 先檢查會員是否存在
      const existingMember = await this.prisma.member.findUnique({
        where: { id: memberId },
        include: { user: true },
      });

      if (!existingMember) {
        throw new NotFoundException(`會員不存在: ${memberId}`);
      }

      console.log('💰 Found member:', existingMember);

      if (!isBoss(actor)) {
        if (existingMember.user.branchId !== actor.branchId) {
          throw new ForbiddenException('Cannot topup outside your branch');
        }
        if (existingMember.user.primaryArtistId !== actor.id) {
          throw new ForbiddenException('Cannot topup customer not owned by this artist');
        }
      }

      const amount = Math.trunc(Number(input.amount));
      if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('儲值金額必須大於 0');

      // 將儲值納入帳務：建立 STORED_VALUE_TOPUP 帳單 + 付款 + 同步 balance + topupHistory
      const bill = await this.billing.createStoredValueTopupBill(actor, {
        customerId: existingMember.userId,
        amount,
        method: input.method || 'CASH',
        branchId: existingMember.user.branchId ?? actor.branchId ?? undefined,
        notes: input.notes || `會員管理-儲值（operatorId=${finalOperatorId}）`,
      });

      // Return latest member snapshot for UI refresh (and bill id for traceability)
      const member = await this.prisma.member.findUnique({ where: { id: memberId } });

      await this.audit.log({
        actor,
        action: 'MEMBER_TOPUP',
        entityType: 'MEMBER',
        entityId: memberId,
        diff: member
          ? {
              'member.balance': { from: existingMember.balance, to: member.balance },
            }
          : null,
        metadata: {
          memberId,
          userId: existingMember.userId,
          amount,
          method: input.method || 'CASH',
          billId: bill?.id ?? null,
        },
      });

      return { member, bill };
    } catch (error) {
      console.error('💰 topupUser error:', error);
      throw error;
    }
  }

  async getTopupHistory(actor: AccessActor, id: string) {
    console.log('🔍 getTopupHistory called with id:', id);
    if (!isBoss(actor)) {
      const member = await this.prisma.member.findUnique({
        where: { id },
        include: { user: true },
      });
      if (!member) throw new NotFoundException('會員不存在');
      if (member.user.branchId !== actor.branchId) throw new ForbiddenException('Insufficient permissions');
      if (member.user.primaryArtistId !== actor.id) throw new ForbiddenException('Insufficient permissions');
    }
    const result = await this.prisma.topupHistory.findMany({
      where: { memberId: id },
      include: {
        operator: {
          select: {
            id: true,
            phone: true,
            name: true,   // ✅ 確保回傳 name
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log('🔍 getTopupHistory result:', JSON.stringify(result, null, 2));
    return result;
  }

  async spend(actor: AccessActor, memberId: string, amount: number, operatorId: string) {
    try {
      console.log('💸 spend called with:', { memberId, amount, operatorId, actor });
      
      if (amount <= 0) {
        throw new BadRequestException('消費金額必須大於 0');
      }

      // If no operatorId, fallback to actor.id (safer than hardcoded)
      const finalOperatorId = operatorId || actor.id;

      const updated = await this.prisma.$transaction(async (tx) => {
        // 檢查會員餘額是否足夠
        const member = await tx.member.findUnique({
          where: { id: memberId },
          include: { user: true },
        });

        if (!member) {
          throw new NotFoundException(`會員不存在: ${memberId}`);
        }

        console.log('💸 Found member:', member);

        if (!isBoss(actor)) {
          if (member.user.branchId !== actor.branchId) {
            throw new ForbiddenException('Cannot spend outside your branch');
          }
          if (member.user.primaryArtistId !== actor.id) {
            throw new ForbiddenException('Cannot spend for customer not owned by this artist');
          }
        }

        if (member.balance < amount) {
          throw new BadRequestException(`餘額不足，無法完成消費。當前餘額: ${member.balance}, 消費金額: ${amount}`);
        }

        const resolvedBranchId = member.user.branchId ?? actor.branchId ?? null;
        if (!resolvedBranchId) {
          throw new BadRequestException('此會員未分配分店，無法建立帳務。請先為會員指定分店');
        }

        // 建立一筆「非預約帳單 + 儲值扣款付款」，讓帳務管理可追蹤，並讓 totalSpent 與帳務實收一致
        const bill = await tx.appointmentBill.create({
          data: {
            appointmentId: null,
            branchId: resolvedBranchId,
            customerId: member.userId,
            artistId: null,
            currency: 'TWD',
            billType: 'OTHER',
            customerNameSnapshot: member.user.name ?? null,
            customerPhoneSnapshot: member.user.phone ?? null,
            createdById: actor.id,
            listTotal: Math.trunc(amount),
            discountTotal: 0,
            billTotal: Math.trunc(amount),
            status: 'SETTLED',
            voidReason: null,
            voidedAt: null,
            items: {
              create: [
                {
                  serviceId: null,
                  nameSnapshot: '儲值扣款消費',
                  basePriceSnapshot: Math.trunc(amount),
                  finalPriceSnapshot: Math.trunc(amount),
                  variantsSnapshot: null,
                  notes: null,
                  sortOrder: 0,
                },
              ],
            },
          },
        });

        const payment = await tx.payment.create({
          data: {
            billId: bill.id,
            amount: Math.trunc(amount),
            method: 'STORED_VALUE',
            paidAt: new Date(),
            recordedById: actor.id,
            notes: '會員管理-消費（儲值扣款）',
          },
        });

        // STORED_VALUE 扣款不進拆帳（allocations 固定 0/0）
        await tx.paymentAllocation.createMany({
          data: [
            { paymentId: payment.id, target: 'ARTIST', amount: 0 },
            { paymentId: payment.id, target: 'SHOP', amount: 0 },
          ],
        });

        // 扣減餘額 + 同步累計消費（以帳務實收為準）
        const updatedMember = await tx.member.update({
          where: { id: memberId },
          data: {
            balance: { decrement: Math.trunc(amount) },
            totalSpent: { increment: Math.trunc(amount) },
          },
        });

        // 記錄消費歷史（儲值扣款）
        await tx.topupHistory.create({
          data: {
            memberId,
            operatorId: finalOperatorId,
            amount: Math.trunc(amount),
            type: 'SPEND',
          },
        });

        console.log('💸 Created billing bill/payment for spend:', { billId: bill.id, paymentId: payment.id });
        console.log('💸 Updated member after spend:', updatedMember);
        return updatedMember;
      });

      await this.audit.log({
        actor,
        action: 'MEMBER_SPEND',
        entityType: 'MEMBER',
        entityId: memberId,
        metadata: { memberId, amount: Math.trunc(amount), operatorId: operatorId || actor.id },
      });

      return updated;
    } catch (error) {
      console.error('💸 spend error:', error);
      throw error;
    }
  }
}
