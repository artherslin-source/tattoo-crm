import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isBoss, isArtist, type AccessActor } from '../common/access/access.types';
import type { Prisma } from '@prisma/client';
import { BillingService } from '../billing/billing.service';
import { calculatePriceAndDuration, getAddonTotal } from '../cart/pricing';
import { resolveArtistScope, getAllArtistUserIdsForLogin, resolveTargetArtistUserIdForBranch } from '../common/access/artist-scope';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly audit: AuditService,
  ) {}

  // Policy: reschedule up to 2 times, no time restriction (removed 24h cutoff)
  private rescheduleMaxCount = 2;
  private cancelCutoffMs = 24 * 60 * 60 * 1000;
  private maxHoldMin = 24 * 60; // 24h cap

  private async resolveAccessibleBranchIds(actor: AccessActor): Promise<string[]> {
    if (isBoss(actor)) return [];
    const ids = new Set<string>();
    if (actor.branchId) ids.add(actor.branchId);
    if (isArtist(actor)) {
      const rows = await this.prisma.artistBranchAccess.findMany({
        where: { userId: actor.id },
        select: { branchId: true },
      });
      for (const r of rows) ids.add(r.branchId);
    }
    return Array.from(ids);
  }

  private async buildScopeWhere(actor: AccessActor, branchId?: string): Promise<Prisma.AppointmentWhereInput> {
    if (isBoss(actor)) return {};
    if (!isArtist(actor)) {
      // Non-boss non-artist: scope by own branch
      return actor.branchId ? { branchId: actor.branchId } : {};
    }
    const { selectedBranchId, accessibleBranchIds, allArtistUserIds } = await resolveArtistScope(this.prisma, actor, branchId);
    if (!accessibleBranchIds.length) throw new ForbiddenException('Insufficient permissions');

    const branchWhere: Prisma.AppointmentWhereInput = selectedBranchId
      ? { branchId: selectedBranchId }
      : { branchId: { in: accessibleBranchIds } };

    return {
      AND: [
        branchWhere,
        {
          OR: [
            { artistId: { in: allArtistUserIds } as any },
            { user: { primaryArtistId: { in: allArtistUserIds } as any } as any },
          ],
        },
      ],
    };
  }

  async findAll(filters: { 
    actor: AccessActor;
    search?: string; 
    status?: string; 
    startDate?: string; 
    endDate?: string;
    branchId?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: any = {
      AND: [],
    };

    if (!isBoss(filters.actor)) {
      if (isArtist(filters.actor)) {
        const { selectedBranchId, accessibleBranchIds, allArtistUserIds } = await resolveArtistScope(
          this.prisma,
          filters.actor,
          filters.branchId,
        );
        if (selectedBranchId) {
          where.AND.push({ branchId: selectedBranchId });
        } else {
          where.AND.push({ branchId: { in: accessibleBranchIds } });
        }
        where.AND.push({
          OR: [
            { artistId: { in: allArtistUserIds } as any },
            { user: { primaryArtistId: { in: allArtistUserIds } as any } as any },
          ],
        });
      } else if (filters.actor.branchId) {
        where.AND.push({ branchId: filters.actor.branchId });
      }
    } else if (filters?.branchId && filters.branchId !== 'all') {
      where.AND.push({ branchId: filters.branchId });
      console.log('🔍 Branch filter applied (BOSS):', filters.branchId);
    }

    if (filters?.search) {
      where.AND = where.AND ?? [];
      where.AND.push({
        user: {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search, mode: 'insensitive' } },
        ],
        },
      });
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.startAt = where.startAt ?? {};
      if (filters.startDate) {
        where.startAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.startAt.lte = new Date(filters.endDate);
      }
    }

    let orderBy: any[] = [];
    
    console.log('🔍 Appointment filters:', filters);
    console.log('🔍 Where conditions:', JSON.stringify(where, null, 2));
    console.log('🔍 Appointment sort filters:', { sortField: filters?.sortField, sortOrder: filters?.sortOrder });
    
    if (filters?.sortField && filters?.sortOrder) {
      switch (filters.sortField) {
        case 'customerName':
          orderBy.push({ user: { name: filters.sortOrder } });
          break;
        case 'customerEmail':
          orderBy.push({ user: { email: filters.sortOrder } });
          break;
        case 'branch':
          orderBy.push({ branch: { name: filters.sortOrder } });
          break;
        case 'service':
          orderBy.push({ service: { name: filters.sortOrder } });
          break;
        case 'artist':
          orderBy.push({ artist: { name: filters.sortOrder } });
          break;
        case 'startAt':
          orderBy.push({ startAt: filters.sortOrder });
          break;
        case 'status':
          orderBy.push({ status: filters.sortOrder });
          break;
        case 'createdAt':
          orderBy.push({ createdAt: filters.sortOrder });
          break;
        default:
          orderBy.push({ startAt: 'desc' });
      }
    } else {
      orderBy.push({ startAt: 'desc' });
    }
    
    orderBy.push({ id: 'desc' });

    console.log('🔍 Final appointment orderBy:', JSON.stringify(orderBy, null, 2));

    return this.prisma.appointment.findMany({
      where,
      select: {
        id: true,
        userId: true,
        serviceId: true,
        artistId: true,
        branchId: true,
        startAt: true,
        endAt: true,
        status: true,
        holdMin: true,
        notes: true,
        contactId: true,
        cartSnapshot: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true, phone: true, primaryArtistId: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        bill: { select: { id: true, billTotal: true, status: true, billType: true } },
        contact: {
          select: {
            id: true,
            cartSnapshot: true,
            cartTotalPrice: true,
          },
        },
      },
      orderBy,
    });
  }

  async findOne(input: { actor: AccessActor; id: string }) {
    const scope = await this.buildScopeWhere(input.actor);
    const appointment = await this.prisma.appointment.findFirst({
      where: { AND: [{ id: input.id }, scope] },
      select: {
        id: true,
        userId: true,
        serviceId: true,
        artistId: true,
        branchId: true,
        startAt: true,
        endAt: true,
        status: true,
        holdMin: true,
        notes: true,
        contactId: true,
        cartSnapshot: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true, phone: true, primaryArtistId: true } },
        service: { select: { id: true, name: true, description: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        bill: { select: { id: true, billTotal: true, status: true, billType: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    // Attach customer notes + history services with hybrid scoping rules:
    // - Primary owner (or BOSS): can see all notes/history of that customer in the shop
    // - Exception appointment (appointment.artistId === actor.id): can see own notes + own completed services
    const isPrimaryOwner =
      isBoss(input.actor) || (appointment.user?.primaryArtistId && appointment.user.primaryArtistId === input.actor.id);

    const [customerNotes, historyServices] = await Promise.all([
      this.prisma.customerNote.findMany({
        where: {
          customerId: appointment.userId,
          ...(isPrimaryOwner ? {} : { createdBy: input.actor.id }),
        },
        include: {
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.completedService.findMany({
        where: {
          customerId: appointment.userId,
          ...(isPrimaryOwner ? {} : { artistId: input.actor.id }),
        },
        select: {
          id: true,
          serviceName: true,
          servicePrice: true,
          completedAt: true,
          branchId: true,
          artistId: true,
        },
        orderBy: { completedAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      ...appointment,
      customerNotes,
      historyServices,
    };
  }

  async create(input: { 
    actor: AccessActor;
    startAt: Date; 
    endAt: Date; 
    userId: string; 
    serviceId: string; 
    artistId: string; 
    branchId: string; 
    notes?: string;
    selectedVariants?: Record<string, any>;
    contactId?: string;
  }) {
    try {
      let effectiveArtistId = input.artistId;

      // Scope validation for ARTIST
      if (!isBoss(input.actor)) {
        const accessible = await this.resolveAccessibleBranchIds(input.actor);
        if (!accessible.includes(input.branchId)) throw new ForbiddenException('Cannot create appointment outside your allowed branches');

        if (isArtist(input.actor)) {
          // Single-login multi-identity: pick correct identity by branch for write operations.
          effectiveArtistId = await resolveTargetArtistUserIdForBranch(this.prisma, input.actor, input.branchId);
        }
      }

      console.log('🔍 開始驗證外鍵:', {
        userId: input.userId,
        serviceId: input.serviceId,
        artistId: effectiveArtistId,
        branchId: input.branchId
      });

      // 驗證所有外鍵是否存在
      const [user, service, artist, branch] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: input.userId } }),
        this.prisma.service.findUnique({
          where: { id: input.serviceId },
          include: { variants: { where: { isActive: true } } },
        }),
        this.prisma.user.findUnique({ where: { id: effectiveArtistId } }), // artistId is User.id
        this.prisma.branch.findUnique({ where: { id: input.branchId } }),
      ]);

      console.log('🔍 外鍵驗證結果:', {
        user: user ? '存在' : '不存在',
        service: service ? '存在' : '不存在',
        artist: artist ? '存在' : '不存在',
        branch: branch ? '存在' : '不存在'
      });

      if (!user) {
        throw new BadRequestException("用戶不存在");
      }
      if (!isBoss(input.actor)) {
        // Hybrid ownership model: manual assignment of primary artist.
        // If customer isn't assigned yet, allow ARTIST to assign when creating the first appointment.
        if (!user.primaryArtistId) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { primaryArtistId: effectiveArtistId, branchId: input.branchId ?? input.actor.branchId ?? user.branchId },
          });
        } else if (user.primaryArtistId !== input.actor.id && user.primaryArtistId !== effectiveArtistId) {
          throw new ForbiddenException('Customer is not owned by this artist');
        }
      }
      if (!service) {
        throw new BadRequestException("服務項目不存在");
      }
      if (!artist) {
        throw new BadRequestException("刺青師不存在");
      }
      if (!branch) {
        throw new BadRequestException("分店不存在");
      }

      // 檢查時間衝突（跨分店）：同一位真人 (personId) 的所有帳號，在同時段不得重疊
      console.log('🔍 檢查時間衝突(跨店/personId):', {
        artistId: input.artistId,
        startAt: input.startAt,
        endAt: input.endAt
      });

      // Cross-identity conflict check for single-login artists
      const artistIdsToCheck: string[] = isArtist(input.actor)
        ? await getAllArtistUserIdsForLogin(this.prisma, input.actor.id)
        : [effectiveArtistId];

      const conflicts = await this.prisma.appointment.findMany({
        where: {
          artistId: { in: artistIdsToCheck },
          status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
          OR: [
            {
              startAt: { lte: input.endAt },
              endAt: { gte: input.startAt },
            },
          ],
        },
        include: {
          user: { select: { name: true } },
        },
      });

      console.log('🔍 衝突檢查結果:', conflicts.length, '個衝突');

      if (conflicts.length > 0) {
        const conflictInfo = conflicts.map(conflict => ({
          member: conflict.user.name,
          startTime: conflict.startAt,
          endTime: conflict.endAt,
        }));

        console.log('🚨 發現衝突，拋出 ConflictException:', conflictInfo);
        throw new ConflictException({
          message: "該時段已被預約",
          conflicts: conflictInfo,
        });
      }

      // Enforce: if service has active variants and this is NOT a contact conversion with cartSnapshot,
      // admin must provide at least one selectedVariant.
      const hasActiveVariants = Array.isArray((service as any).variants) && (service as any).variants.length > 0;
      const selected = input.selectedVariants && typeof input.selectedVariants === 'object' ? input.selectedVariants : null;
      const hasSelected = !!selected && Object.keys(selected).length > 0;

      let contactHasCartItems = false;
      if (input.contactId) {
        const c = await this.prisma.contact.findUnique({
          where: { id: input.contactId },
          select: { cartSnapshot: true },
        });
        const items = (c?.cartSnapshot as any)?.items;
        contactHasCartItems = Array.isArray(items) && items.length > 0;
      }

      if (hasActiveVariants && !hasSelected && !contactHasCartItems) {
        throw new BadRequestException('此服務需要至少選 1 個規格（selectedVariants）才能建立預約');
      }

      // Contact conversion guard + atomic conversion.
      const created = await this.prisma.$transaction(async (tx) => {
        if (input.contactId) {
          const existing = await tx.appointment.findFirst({
            where: { contactId: input.contactId },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          });
          if (existing) {
            throw new ConflictException({
              message: '此聯絡已轉換為預約，請勿重複轉換',
              existingAppointmentId: existing.id,
            });
          }
        }

        const selectedVariants = input.selectedVariants ?? null;
        // Build cartSnapshot consistent with checkout cartSnapshot when selectedVariants is provided.
        const cartSnapshot =
          selectedVariants && typeof selectedVariants === 'object'
            ? (() => {
                const { finalPrice: itemFinalPrice, estimatedDuration } = calculatePriceAndDuration(
                  service.price,
                  service.durationMin,
                  (service as any).variants ?? [],
                  selectedVariants,
                );
                const addonTotal = getAddonTotal(selectedVariants);
                const totalPrice = itemFinalPrice + addonTotal;
                const totalDuration = estimatedDuration;
                return {
                  items: [
                    {
                      serviceId: service.id,
                      serviceName: service.name,
                      selectedVariants,
                      basePrice: service.price,
                      finalPrice: itemFinalPrice,
                      estimatedDuration,
                      notes: input.notes,
                      referenceImages: [],
                    },
                  ],
                  totalPrice,
                  totalDuration,
                };
              })()
            : null;

        const created = await tx.appointment.create({
          data: {
            startAt: input.startAt,
            endAt: input.endAt,
            userId: input.userId,
            serviceId: input.serviceId,
            artistId: effectiveArtistId,
            branchId: input.branchId,
            notes: input.notes,
            contactId: input.contactId,
            status: "PENDING",
            ...(cartSnapshot ? { cartSnapshot: cartSnapshot as any } : {}),
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            artist: { select: { id: true, name: true } },
            service: { select: { id: true, name: true, price: true, durationMin: true } },
            branch: { select: { id: true, name: true } },
            contact: { select: { id: true, name: true, email: true, phone: true } },
          },
        });

        if (input.contactId) {
          // Mark as converted; ensure owner assignment if missing.
          const contact = await tx.contact.findUnique({
            where: { id: input.contactId },
            select: { id: true, ownerArtistId: true },
          });
          if (contact) {
            await tx.contact.update({
              where: { id: input.contactId },
              data: {
                status: 'CONVERTED',
                ownerArtistId: contact.ownerArtistId ?? effectiveArtistId,
              },
            });
          }
        }

        return created;
      });

      await this.audit.log({
        actor: input.actor,
        action: 'APPOINTMENT_CREATE',
        entityType: 'APPOINTMENT',
        entityId: created.id,
        metadata: {
          appointmentId: created.id,
          userId: input.userId,
          serviceId: input.serviceId,
          artistId: created.artistId,
          branchId: input.branchId,
          contactId: input.contactId ?? null,
        },
      });

      return created;
    } catch (error) {
      console.error('❌ CreateAppointment Error:', error);
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('創建預約失敗: ' + error.message);
    }
  }

  async updateStatus(input: { actor: AccessActor; id: string; status: string }) {
    if (!['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'].includes(input.status)) {
      throw new BadRequestException('無效的狀態');
    }

    const scope = await this.buildScopeWhere(input.actor);
    const appointment = await this.prisma.appointment.findFirst({ 
      where: { AND: [{ id: input.id }, scope] },
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        bill: true,
      }
    });
    
    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    // 只更新狀態；訂單機制已移除，改由 Billing 作為單一口徑
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: input.id },
      data: { status: input.status as any },
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        bill: true,
      },
    });

    // Ensure bill exists once schedule is confirmed / completed
    if (input.status === 'CONFIRMED' || input.status === 'COMPLETED') {
      await this.billing.ensureBillForAppointment(input.actor, input.id);
    }

    await this.audit.log({
      actor: input.actor,
      action: 'APPOINTMENT_UPDATE_STATUS',
      entityType: 'APPOINTMENT',
      entityId: input.id,
      diff: { 'appointment.status': { from: appointment.status, to: input.status } },
      metadata: { appointmentId: input.id },
    });

    return updatedAppointment;
  }

  private clampEndToSameDay(startAt: Date, endAt: Date): Date {
    const dayEnd = new Date(startAt);
    dayEnd.setHours(23, 59, 0, 0);
    return endAt > dayEnd ? dayEnd : endAt;
  }

  async confirmSchedule(input: { actor: AccessActor; id: string; startAt: Date; holdMin: number; reason?: string }) {
    const scope = await this.buildScopeWhere(input.actor);
    let beforeStatus: string | null = null;
    let beforeStartAt: Date | null = null;
    let beforeEndAt: Date | null = null;
    const updatedAppointment = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: { AND: [{ id: input.id }, scope] },
        select: {
          id: true,
          status: true,
          startAt: true,
          endAt: true,
          branchId: true,
          artistId: true,
          userId: true,
          serviceId: true,
          cartSnapshot: true,
        },
      });
      if (!appointment) throw new NotFoundException('預約不存在');
      beforeStatus = (appointment.status as any) ?? null;
      beforeStartAt = (appointment.startAt as any) ?? null;
      beforeEndAt = (appointment.endAt as any) ?? null;
      if (appointment.status !== 'INTENT') {
        throw new BadRequestException('只有意向預約可以排定正式時間');
      }

      const holdMin = input.holdMin;
      if (!Number.isInteger(holdMin) || holdMin <= 0) {
        throw new BadRequestException('保留時間必須為正整數（分鐘）');
      }
      if (holdMin > this.maxHoldMin) {
        throw new BadRequestException('保留時間不可超過 24 小時');
      }

      const computedEndAt = this.clampEndToSameDay(input.startAt, new Date(input.startAt.getTime() + holdMin * 60000));

      if (appointment.artistId) {
        const conflict = await tx.appointment.findFirst({
          where: {
            id: { not: appointment.id },
            branchId: appointment.branchId,
            artistId: appointment.artistId,
            status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
            startAt: { lt: computedEndAt },
            endAt: { gt: input.startAt },
          },
          select: { id: true },
        });
        if (conflict) throw new ConflictException('該時段已被預約');
      }

      const updatedAppointment = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          startAt: input.startAt,
          endAt: computedEndAt,
          holdMin,
          holdUpdatedAt: new Date(),
          holdUpdatedBy: input.actor.id,
          holdUpdateReason: input.reason ?? null,
          status: 'CONFIRMED',
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, primaryArtistId: true } },
          service: { select: { id: true, name: true, price: true, durationMin: true } },
          artist: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          bill: true,
        },
      });

      return updatedAppointment;
    });

    await this.billing.ensureBillForAppointment(input.actor, input.id);

    await this.audit.log({
      actor: input.actor,
      action: 'APPOINTMENT_UPDATE_STATUS',
      entityType: 'APPOINTMENT',
      entityId: input.id,
      diff: {
        ...(beforeStatus !== null ? { 'appointment.status': { from: beforeStatus, to: 'CONFIRMED' } } : {}),
        ...(beforeStartAt ? { 'appointment.startAt': { from: beforeStartAt, to: updatedAppointment.startAt } } : {}),
        ...(beforeEndAt ? { 'appointment.endAt': { from: beforeEndAt, to: updatedAppointment.endAt } } : {}),
      },
      metadata: { appointmentId: input.id, reason: input.reason ?? null },
    });

    return updatedAppointment;
  }

  async reschedule(input: { actor: AccessActor; id: string; startAt: Date; endAt: Date; holdMin?: number; reason?: string }) {
    const scope = await this.buildScopeWhere(input.actor);
    const appointment = await this.prisma.appointment.findFirst({
      where: { AND: [{ id: input.id }, scope] },
      include: { user: { select: { id: true, primaryArtistId: true } } },
    });
    if (!appointment) throw new NotFoundException('預約不存在');

    if (appointment.status === 'CANCELED' || appointment.status === 'COMPLETED' || appointment.status === 'NO_SHOW') {
      throw new BadRequestException('此預約狀態不可改期');
    }

    // Removed 24-hour advance notice requirement - allow rescheduling anytime
    if ((appointment.rescheduleCount ?? 0) >= this.rescheduleMaxCount) {
      throw new BadRequestException(`最多可改期 ${this.rescheduleMaxCount} 次`);
    }

    // holdMin: if provided, validate; otherwise keep existing appointment.holdMin
    const nextHoldMin = input.holdMin ?? appointment.holdMin ?? 150;
    if (!Number.isInteger(nextHoldMin) || nextHoldMin <= 0) {
      throw new BadRequestException('保留時間必須為正整數（分鐘）');
    }
    if (nextHoldMin > this.maxHoldMin) {
      throw new BadRequestException('保留時間不可超過 24 小時');
    }

    // Recompute endAt from holdMin (source of truth) and clamp to same day (no cross-day lock)
    const computedEndAt = this.clampEndToSameDay(input.startAt, new Date(input.startAt.getTime() + nextHoldMin * 60000));

    // Conflict check for artist
    if (appointment.artistId) {
      const conflict = await this.prisma.appointment.findFirst({
        where: {
          id: { not: appointment.id },
          branchId: appointment.branchId,
          artistId: appointment.artistId,
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
          startAt: { lt: computedEndAt },
          endAt: { gt: input.startAt },
        },
        select: { id: true },
      });
      if (conflict) throw new ConflictException('該時段已被預約');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        startAt: input.startAt,
        endAt: computedEndAt,
        holdMin: nextHoldMin,
        holdUpdatedAt: new Date(),
        holdUpdatedBy: input.actor.id,
        holdUpdateReason: input.reason ?? null,
        rescheduleCount: { increment: 1 },
        lastRescheduledAt: new Date(),
        rescheduleReason: input.reason ?? null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, primaryArtistId: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        bill: true,
      },
    });

    await this.audit.log({
      actor: input.actor,
      action: 'APPOINTMENT_RESCHEDULE',
      entityType: 'APPOINTMENT',
      entityId: input.id,
      diff: {
        'appointment.startAt': { from: appointment.startAt, to: updated.startAt },
        'appointment.endAt': { from: appointment.endAt, to: updated.endAt },
      },
      metadata: { appointmentId: input.id, reason: input.reason ?? null },
    });

    return updated;
  }

  async cancel(input: { actor: AccessActor; id: string; reason?: string }) {
    const scope = await this.buildScopeWhere(input.actor);
    const appointment = await this.prisma.appointment.findFirst({
      where: { AND: [{ id: input.id }, scope] },
      select: { id: true, status: true, startAt: true },
    });
    if (!appointment) throw new NotFoundException('預約不存在');

    if (appointment.status === 'COMPLETED') throw new BadRequestException('已完成預約不可取消');
    if (appointment.status === 'CANCELED') return { success: true };

    const now = Date.now();
    if (appointment.startAt.getTime() - now < this.cancelCutoffMs) {
      throw new BadRequestException('取消需提前 24 小時以上');
    }

    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        cancelReason: input.reason ?? null,
      },
    });

    await this.audit.log({
      actor: input.actor,
      action: 'APPOINTMENT_CANCEL',
      entityType: 'APPOINTMENT',
      entityId: input.id,
      diff: { 'appointment.status': { from: appointment.status, to: 'CANCELED' } },
      metadata: { appointmentId: input.id, reason: input.reason ?? null },
    });
    return { success: true };
  }

  async noShow(input: { actor: AccessActor; id: string; reason?: string }) {
    const scope = await this.buildScopeWhere(input.actor);
    const appointment = await this.prisma.appointment.findFirst({
      where: { AND: [{ id: input.id }, scope] },
      select: { id: true, status: true },
    });
    if (!appointment) throw new NotFoundException('預約不存在');

    if (appointment.status === 'COMPLETED') throw new BadRequestException('已完成預約不可標記 No-show');
    if (appointment.status === 'CANCELED') throw new BadRequestException('已取消預約不可標記 No-show');

    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'NO_SHOW',
        noShowAt: new Date(),
        noShowReason: input.reason ?? null,
      },
    });

    await this.audit.log({
      actor: input.actor,
      action: 'APPOINTMENT_NO_SHOW',
      entityType: 'APPOINTMENT',
      entityId: input.id,
      diff: { 'appointment.status': { from: appointment.status, to: 'NO_SHOW' } },
      metadata: { appointmentId: input.id, reason: input.reason ?? null },
    });
    return { success: true };
  }

  async update(input: { actor: AccessActor; id: string; data: { startAt?: Date; endAt?: Date; notes?: string; artistId?: string } }) {
    const scope = await this.buildScopeWhere(input.actor);
    const appointment = await this.prisma.appointment.findFirst({ where: { AND: [{ id: input.id }, scope] } });
    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    // 如果修改時間，檢查衝突
    if (input.data.startAt || input.data.endAt) {
      const startAt = input.data.startAt || appointment.startAt;
      const endAt = input.data.endAt || appointment.endAt;

      const conflict = await this.prisma.appointment.findFirst({
        where: {
          id: { not: input.id },
          serviceId: appointment.serviceId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          OR: [
            {
              startAt: { lte: endAt },
              endAt: { gte: startAt },
            },
          ],
        },
      });

      if (conflict) {
        throw new BadRequestException('該時段已有其他預約');
      }
    }

    const updated = await this.prisma.appointment.update({
      where: { id: input.id },
      data: input.data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    const diff: Record<string, { from: unknown; to: unknown }> = {};
    if (input.data.startAt && appointment.startAt !== input.data.startAt) diff['appointment.startAt'] = { from: appointment.startAt, to: input.data.startAt };
    if (input.data.endAt && appointment.endAt !== input.data.endAt) diff['appointment.endAt'] = { from: appointment.endAt, to: input.data.endAt };
    if (input.data.notes !== undefined && appointment.notes !== input.data.notes) diff['appointment.notes'] = { from: appointment.notes ?? null, to: input.data.notes ?? null };
    if (input.data.artistId && appointment.artistId !== input.data.artistId) diff['appointment.artistId'] = { from: appointment.artistId ?? null, to: input.data.artistId };

    await this.audit.log({
      actor: input.actor,
      action: 'APPOINTMENT_UPDATE',
      entityType: 'APPOINTMENT',
      entityId: input.id,
      diff: Object.keys(diff).length ? diff : null,
      metadata: { appointmentId: input.id },
    });

    return updated;
  }

  async remove(input: { actor: AccessActor; id: string }) {
    const scope = await this.buildScopeWhere(input.actor);
    const appointment = await this.prisma.appointment.findFirst({ where: { AND: [{ id: input.id }, scope] } });
    if (!appointment) {
      throw new NotFoundException('預約不存在');
    }

    await this.prisma.appointment.delete({ where: { id: input.id } });

    await this.audit.log({
      actor: input.actor,
      action: 'APPOINTMENT_DELETE',
      entityType: 'APPOINTMENT',
      entityId: input.id,
      metadata: { appointmentId: input.id },
    });
    return { message: '預約已刪除' };
  }
}
