import { BadRequestException, ForbiddenException, NotFoundException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isBoss, isArtist, type AccessActor } from '../common/access/access.types';
import { BILL_TYPE_STORED_VALUE_TOPUP } from './billing.constants';

type BillStatus = 'OPEN' | 'SETTLED' | 'VOID';

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundHalfUp(n: number) {
  return Math.round(n);
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async createStoredValueTopupBill(
    actor: AccessActor,
    input: { customerId: string; amount: number; method: string; notes?: string; branchId?: string },
  ) {
    const amount = Math.trunc(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('amount must be positive integer');
    const method = input.method.toUpperCase();

    // Only BOSS can topup any branch; non-boss must stay within own branch.
    if (!isBoss(actor) && input.branchId && actor.branchId && input.branchId !== actor.branchId) {
      throw new ForbiddenException('Cannot topup outside your branch');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: input.customerId },
        select: { id: true, name: true, phone: true, branchId: true },
      });
      if (!user) throw new NotFoundException('會員不存在');

      const branchId = input.branchId ?? user.branchId ?? actor.branchId ?? null;
      if (!branchId) throw new BadRequestException('無法判定分店（請提供 branchId 或先為會員指定分店）');

      // ensure member record exists
      let member = await tx.member.findUnique({ where: { userId: user.id } });
      if (!member) {
        member = await tx.member.create({ data: { userId: user.id, totalSpent: 0, balance: 0 } });
      }

      // Create history first so we can embed id in notes for idempotent backfill.
      const history = await tx.topupHistory.create({
        data: {
          memberId: member.id,
          operatorId: actor.id,
          amount,
          type: 'TOPUP',
        },
      });

      const bill = await tx.appointmentBill.create({
        data: {
          appointmentId: null,
          branchId,
          customerId: user.id,
          artistId: null,
          currency: 'TWD',
          billType: BILL_TYPE_STORED_VALUE_TOPUP,
          listTotal: amount,
          discountTotal: 0,
          billTotal: amount,
          status: 'SETTLED',
          voidReason: null,
          voidedAt: null,
          customerNameSnapshot: user.name ?? null,
          customerPhoneSnapshot: user.phone ?? null,
          createdById: actor.id,
          items: {
            create: [
              {
                serviceId: null,
                nameSnapshot: '儲值入金',
                basePriceSnapshot: amount,
                finalPriceSnapshot: amount,
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
          amount,
          method,
          paidAt: new Date(),
          recordedById: actor.id,
          notes: `${input.notes || '會員儲值'} (topupHistoryId=${history.id})`,
        },
      });

      // Topup has no artist split: all SHOP.
      await tx.paymentAllocation.createMany({
        data: [
          { paymentId: payment.id, target: 'ARTIST', amount: 0 },
          { paymentId: payment.id, target: 'SHOP', amount },
        ],
      });

      // Update stored value balance (do NOT touch totalSpent; totalSpent is consumption-only)
      await tx.member.update({
        where: { id: member.id },
        data: { balance: { increment: amount } },
      });

      // IMPORTANT:
      // Don't call this.getBillById() inside the transaction.
      // It uses this.prisma (a separate client/connection), which may not see uncommitted data yet,
      // causing false 403 ("Insufficient permissions") even though the bill was just created.
      return { billId: bill.id };
    });

    // Non-boss: return minimal payload; UI can fetch detail later if needed.
    if (!isBoss(actor)) return { id: created.billId };

    // Boss: fetch full detail AFTER the transaction commits.
    return this.getBillById(actor, created.billId);
  }

  async refundToStoredValue(actor: AccessActor, billId: string, input: { amount: number; notes?: string }) {
    await this.ensureBillReadable(actor, billId);
    const amount = Math.trunc(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('amount must be positive integer');

    const created = await this.prisma.$transaction(async (tx) => {
      const sourceBill = await tx.appointmentBill.findUnique({
        where: { id: billId },
        select: { id: true, branchId: true, customerId: true },
      });
      if (!sourceBill) throw new NotFoundException('帳務不存在');
      if (!sourceBill.customerId) throw new BadRequestException('此帳務未綁定會員，無法退回儲值');

      const user = await tx.user.findUnique({
        where: { id: sourceBill.customerId },
        select: { id: true, name: true, phone: true },
      });
      if (!user) throw new NotFoundException('會員不存在');

      const member = await tx.member.findUnique({ where: { userId: user.id } });
      if (!member) throw new BadRequestException('此會員尚未建立儲值帳戶');

      const history = await tx.topupHistory.create({
        data: {
          memberId: member.id,
          operatorId: actor.id,
          amount,
          type: 'TOPUP',
        },
      });

      const bill = await tx.appointmentBill.create({
        data: {
          appointmentId: null,
          branchId: sourceBill.branchId,
          customerId: user.id,
          artistId: null,
          currency: 'TWD',
          billType: BILL_TYPE_STORED_VALUE_TOPUP,
          listTotal: amount,
          discountTotal: 0,
          billTotal: amount,
          status: 'SETTLED',
          voidReason: null,
          voidedAt: null,
          customerNameSnapshot: user.name ?? null,
          customerPhoneSnapshot: user.phone ?? null,
          createdById: actor.id,
          items: {
            create: [
              {
                serviceId: null,
                nameSnapshot: '退費轉儲值',
                basePriceSnapshot: amount,
                finalPriceSnapshot: amount,
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
          amount,
          method: 'OTHER',
          paidAt: new Date(),
          recordedById: actor.id,
          notes: `${input.notes || '退費轉儲值'} (sourceBillId=${sourceBill.id}, topupHistoryId=${history.id})`,
        },
      });

      await tx.paymentAllocation.createMany({
        data: [
          { paymentId: payment.id, target: 'ARTIST', amount: 0 },
          { paymentId: payment.id, target: 'SHOP', amount },
        ],
      });

      await tx.member.update({
        where: { id: member.id },
        data: { balance: { increment: amount } },
      });

      return { billId: bill.id };
    });

    // Same reason as createStoredValueTopupBill(): fetch detail after commit.
    if (!isBoss(actor)) return { id: created.billId };
    return this.getBillById(actor, created.billId);
  }

  private async ensureAppointmentReadable(actor: AccessActor, appointmentId: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        ...(isBoss(actor) ? {} : { branchId: actor.branchId ?? undefined }),
      },
      select: { id: true, branchId: true, artistId: true, userId: true },
    });
    if (!appt) throw new ForbiddenException('Insufficient permissions');
    if (isArtist(actor) && appt.artistId && appt.artistId !== actor.id) {
      // Artist can only manage own appointment bills (v1)
      throw new ForbiddenException('Insufficient permissions');
    }
    return appt;
  }

  private async ensureBillReadable(actor: AccessActor, billId: string) {
    const bill = await this.prisma.appointmentBill.findFirst({
      where: {
        id: billId,
        ...(isBoss(actor) ? {} : { branchId: actor.branchId ?? undefined }),
      },
      select: {
        id: true,
        branchId: true,
        artistId: true,
        appointmentId: true,
        billType: true,
        createdById: true,
      },
    });
    if (!bill) throw new ForbiddenException('Insufficient permissions');
    if (isArtist(actor)) {
      // Normal bills: artist can only access own bills.
      if (bill.artistId && bill.artistId === actor.id) return bill;

      // Stored value topups/refunds: bill has no artistId; allow the artist who created it to read it.
      if (bill.billType === BILL_TYPE_STORED_VALUE_TOPUP && bill.createdById === actor.id) return bill;

      throw new ForbiddenException('Insufficient permissions');
    }
    return bill;
  }

  private computeTotalsFromCartSnapshot(cartSnapshot: any): {
    listTotal: number;
    billTotal: number;
    discountTotal: number;
    items: Array<{
      serviceId?: string | null;
      nameSnapshot: string;
      basePriceSnapshot: number;
      finalPriceSnapshot: number;
      variantsSnapshot?: any;
      notes?: string | null;
      sortOrder: number;
    }>;
  } | null {
    const items = cartSnapshot?.items;
    if (!Array.isArray(items) || items.length === 0) return null;

    const mapped = items.map((it: any, idx: number) => {
      const base = Number(it?.basePrice ?? it?.finalPrice ?? 0);
      const final = Number(it?.finalPrice ?? it?.basePrice ?? 0);
      return {
        serviceId: it?.serviceId ?? null,
        nameSnapshot: String(it?.serviceName ?? it?.name ?? '服務'),
        basePriceSnapshot: Math.max(0, Math.trunc(base)),
        finalPriceSnapshot: Math.max(0, Math.trunc(final)),
        variantsSnapshot: it?.selectedVariants ?? it?.variants ?? null,
        notes: it?.notes ?? null,
        sortOrder: idx,
      };
    });

    const listTotal = mapped.reduce((sum, it) => sum + it.basePriceSnapshot, 0);
    const billTotal = mapped.reduce((sum, it) => sum + it.finalPriceSnapshot, 0);
    const discountTotal = Math.max(0, listTotal - billTotal);
    return { listTotal, billTotal, discountTotal, items: mapped };
  }

  private async resolveSplitRule(actor: AccessActor, artistId: string | null, branchId: string, at: Date) {
    // Default 70/30 if no rule.
    const fallback = { artistRateBps: 7000, shopRateBps: 3000 };
    if (!artistId) return fallback;

    const rules = await this.prisma.artistSplitRule.findMany({
      where: {
        artistId,
        effectiveFrom: { lte: at },
        OR: [{ branchId: branchId }, { branchId: null }],
      },
      orderBy: [{ branchId: 'desc' }, { effectiveFrom: 'desc' }],
      take: 1,
    });
    const rule = rules[0];
    if (!rule) return fallback;
    const artistRateBps = clampInt(rule.artistRateBps, 0, 10000);
    const shopRateBps = clampInt(rule.shopRateBps, 0, 10000);
    // If not summing to 100%, normalize to keep math predictable.
    const sum = artistRateBps + shopRateBps;
    if (sum !== 10000 && sum > 0) {
      const normalizedArtist = roundHalfUp((artistRateBps / sum) * 10000);
      return { artistRateBps: normalizedArtist, shopRateBps: 10000 - normalizedArtist };
    }
    return { artistRateBps, shopRateBps };
  }

  private async ensureBillInternal(tx: Prisma.TransactionClient, appointmentId: string, createdById?: string) {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true },
    });
    if (!appointment) throw new NotFoundException('預約不存在');

    const cartDerived = this.computeTotalsFromCartSnapshot(appointment.cartSnapshot);
    const derivedItems =
      cartDerived?.items ??
      (appointment.service
        ? [
            {
              serviceId: appointment.serviceId,
              nameSnapshot: appointment.service.name,
              basePriceSnapshot: appointment.service.price,
              finalPriceSnapshot: appointment.service.price,
              variantsSnapshot: null,
              notes: null,
              sortOrder: 0,
            },
          ]
        : null);

    if (!derivedItems) {
      throw new BadRequestException('此預約沒有可用的服務明細（缺少 cartSnapshot/items 或 serviceId）');
    }

    const listTotal = cartDerived?.listTotal ?? derivedItems.reduce((s, i) => s + i.basePriceSnapshot, 0);
    const billTotal = cartDerived?.billTotal ?? derivedItems.reduce((s, i) => s + i.finalPriceSnapshot, 0);
    const discountTotal = cartDerived?.discountTotal ?? Math.max(0, listTotal - billTotal);

    // 檢查是否已有帳單
    const existingBill = await tx.appointmentBill.findUnique({
      where: { appointmentId },
      include: { items: true },
    });

    // 自動安全重建邏輯：如果既有帳單看起來是舊的 auto-generated（單一 service.price）
    // 且 cartSnapshot 有不同的 totalPrice，則自動更新
    let shouldAutoRebuild = false;
    if (existingBill && cartDerived) {
      const isOldAutoGenerated =
        existingBill.items.length === 1 &&
        existingBill.billTotal === appointment.service?.price;
      const hasDifferentCartTotal = cartDerived.billTotal !== existingBill.billTotal;
      shouldAutoRebuild = isOldAutoGenerated && hasDifferentCartTotal;
      
      if (shouldAutoRebuild) {
        console.log(`🔄 自動重建帳單 ${existingBill.id}：舊金額=${existingBill.billTotal}，新金額=${cartDerived.billTotal}`);
      }
    }

    // Upsert bill
    const bill = await tx.appointmentBill.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        branchId: appointment.branchId,
        customerId: appointment.userId,
        artistId: appointment.artistId ?? null,
        currency: 'TWD',
        billType: 'APPOINTMENT',
        createdById: createdById ?? null,
        listTotal,
        discountTotal,
        billTotal,
        status: 'OPEN',
        items: {
          create: derivedItems.map((it) => ({
            serviceId: it.serviceId ?? null,
            nameSnapshot: it.nameSnapshot,
            basePriceSnapshot: it.basePriceSnapshot,
            finalPriceSnapshot: it.finalPriceSnapshot,
            variantsSnapshot: it.variantsSnapshot ?? null,
            notes: it.notes ?? null,
            sortOrder: it.sortOrder,
          })),
        },
      },
      update: shouldAutoRebuild
        ? {
            listTotal,
            billTotal,
            discountTotal,
          }
        : {},
      include: { items: true },
    });

    // 如果需要自動重建，更新 items
    if (shouldAutoRebuild && existingBill) {
      await tx.appointmentBillItem.deleteMany({
        where: { billId: bill.id },
      });
      await tx.appointmentBillItem.createMany({
        data: derivedItems.map((it) => ({
          billId: bill.id,
          serviceId: it.serviceId ?? null,
          nameSnapshot: it.nameSnapshot,
          basePriceSnapshot: it.basePriceSnapshot,
          finalPriceSnapshot: it.finalPriceSnapshot,
          variantsSnapshot: it.variantsSnapshot ?? null,
          notes: it.notes ?? null,
          sortOrder: it.sortOrder,
        })),
      });
    } else if (bill.items.length === 0) {
      // If bill existed, ensure it has items; otherwise keep as-is (avoid overwriting manual edits).
      await tx.appointmentBillItem.createMany({
        data: derivedItems.map((it) => ({
          billId: bill.id,
          serviceId: it.serviceId ?? null,
          nameSnapshot: it.nameSnapshot,
          basePriceSnapshot: it.basePriceSnapshot,
          finalPriceSnapshot: it.finalPriceSnapshot,
          variantsSnapshot: it.variantsSnapshot ?? null,
          notes: it.notes ?? null,
          sortOrder: it.sortOrder,
        })),
      });
    }

    return bill;
  }

  async ensureBillForAppointment(actor: AccessActor, appointmentId: string) {
    await this.ensureAppointmentReadable(actor, appointmentId);
    // Important: do NOT call getBillByAppointment() inside the transaction, because it uses
    // the root prisma client (a different connection) and cannot see uncommitted writes.
    await this.prisma.$transaction(async (tx) => {
      await this.ensureBillInternal(tx, appointmentId, actor.id);
    });
    return this.getBillByAppointment(actor, appointmentId);
  }

  async getBillById(actor: AccessActor, billId: string) {
    await this.ensureBillReadable(actor, billId);
    const bill = await this.prisma.appointmentBill.findUnique({
      where: { id: billId },
      include: {
        appointment: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
            artist: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
          },
        },
        branch: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        artist: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        payments: {
          orderBy: { paidAt: 'asc' },
          include: {
            allocations: true,
            recordedBy: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!bill) throw new NotFoundException('帳務不存在');

    const paidTotal = bill.payments.reduce((sum, p) => sum + p.amount, 0);
    const dueTotal = bill.billTotal - paidTotal;

    return {
      ...bill,
      summary: {
        paidTotal,
        dueTotal,
      },
    };
  }

  async getBillByAppointment(actor: AccessActor, appointmentId: string) {
    await this.ensureAppointmentReadable(actor, appointmentId);
    const bill = await this.prisma.appointmentBill.findUnique({
      where: { appointmentId },
      include: {
        appointment: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
            artist: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
          },
        },
        items: { orderBy: { sortOrder: 'asc' } },
        payments: {
          orderBy: { paidAt: 'asc' },
          include: {
            allocations: true,
            recordedBy: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!bill) throw new NotFoundException('此預約尚未建立帳務');

    const paidTotal = bill.payments.reduce((sum, p) => sum + p.amount, 0);
    const dueTotal = bill.billTotal - paidTotal;

    return {
      ...bill,
      summary: {
        paidTotal,
        dueTotal,
      },
    };
  }

  async listBills(
    actor: AccessActor,
    query: {
      branchId?: string;
      artistId?: string;
      customerSearch?: string;
      status?: BillStatus | 'all';
      billType?: string | 'all';
      view?: 'CONSUMPTION' | 'ALL';
      startDate?: string;
      endDate?: string;
      sortField?: 'createdAt' | 'billTotal' | 'paidTotal' | 'dueTotal';
      sortOrder?: 'asc' | 'desc';
      minBillTotal?: string | number;
      maxBillTotal?: string | number;
      minPaidTotal?: string | number;
      maxPaidTotal?: string | number;
      minDueTotal?: string | number;
      maxDueTotal?: string | number;
    },
  ) {
    const where: Prisma.AppointmentBillWhereInput = {};

    if (isBoss(actor)) {
      if (query.branchId && query.branchId !== 'all') where.branchId = query.branchId;
    } else {
      where.branchId = actor.branchId ?? undefined;
    }

    if (query.artistId && query.artistId !== 'all') where.artistId = query.artistId;
    if (query.status && query.status !== 'all') where.status = query.status as any;
    if (query.billType && query.billType !== 'all') {
      where.billType = query.billType as any;
    } else if (query.view === 'CONSUMPTION') {
      // default consumption view: exclude stored-value topups to avoid inflating revenue/spent views
      where.billType = { not: BILL_TYPE_STORED_VALUE_TOPUP } as any;
    }

    if (query.startDate || query.endDate) {
      const start = query.startDate ? new Date(query.startDate) : undefined;
      const end = query.endDate ? new Date(query.endDate) : undefined;
      where.createdAt = {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      };
    }

    const toIntOrUndef = (v: unknown) => {
      if (v === null || v === undefined || v === '') return undefined;
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) return undefined;
      return Math.trunc(n);
    };
    const minBillTotal = toIntOrUndef(query.minBillTotal);
    const maxBillTotal = toIntOrUndef(query.maxBillTotal);
    if (minBillTotal !== undefined || maxBillTotal !== undefined) {
      where.billTotal = {
        ...(minBillTotal !== undefined ? { gte: minBillTotal } : {}),
        ...(maxBillTotal !== undefined ? { lte: maxBillTotal } : {}),
      };
    }

    if (query.customerSearch && query.customerSearch.trim() !== '') {
      const q = query.customerSearch.trim();
      where.OR = [
        {
          customer: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        { customerNameSnapshot: { contains: q, mode: 'insensitive' } as any },
        { customerPhoneSnapshot: { contains: q, mode: 'insensitive' } as any },
      ];
    }

    const bills = await this.prisma.appointmentBill.findMany({
      where,
      // Default stable ordering; we can re-sort in memory for computed fields.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        appointment: { select: { id: true, startAt: true, endAt: true, status: true } },
        customer: { select: { id: true, name: true, phone: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        payments: { 
          select: { 
            amount: true,
            allocations: { select: { target: true, amount: true } },
          } 
        },
      },
    });

    const minPaidTotal = toIntOrUndef(query.minPaidTotal);
    const maxPaidTotal = toIntOrUndef(query.maxPaidTotal);
    const minDueTotal = toIntOrUndef(query.minDueTotal);
    const maxDueTotal = toIntOrUndef(query.maxDueTotal);

    let rows = bills.map((b) => {
      const paidTotal = b.payments.reduce((s, p) => s + p.amount, 0);
      
      // 計算拆賬金額
      let artistAmount = 0;
      let shopAmount = 0;
      for (const payment of b.payments) {
        for (const alloc of payment.allocations) {
          if (alloc.target === 'ARTIST') {
            artistAmount += alloc.amount;
          } else if (alloc.target === 'SHOP') {
            shopAmount += alloc.amount;
          }
        }
      }
      
      return {
        ...b,
        summary: {
          paidTotal,
          dueTotal: b.billTotal - paidTotal,
          artistAmount,
          shopAmount,
        },
      };
    });

    // Amount-range filters for computed fields (paid/due)
    if (minPaidTotal !== undefined) rows = rows.filter((r) => r.summary.paidTotal >= minPaidTotal);
    if (maxPaidTotal !== undefined) rows = rows.filter((r) => r.summary.paidTotal <= maxPaidTotal);
    if (minDueTotal !== undefined) rows = rows.filter((r) => r.summary.dueTotal >= minDueTotal);
    if (maxDueTotal !== undefined) rows = rows.filter((r) => r.summary.dueTotal <= maxDueTotal);

    const sortField = query.sortField ?? 'createdAt';
    const sortOrder: 'asc' | 'desc' = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const dir = sortOrder === 'asc' ? 1 : -1;

    rows.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sortField) {
        case 'billTotal':
          av = a.billTotal;
          bv = b.billTotal;
          break;
        case 'paidTotal':
          av = a.summary.paidTotal;
          bv = b.summary.paidTotal;
          break;
        case 'dueTotal':
          av = a.summary.dueTotal;
          bv = b.summary.dueTotal;
          break;
        case 'createdAt':
        default:
          av = new Date(a.createdAt).getTime();
          bv = new Date(b.createdAt).getTime();
          break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      // Tie-breaker
      return a.id < b.id ? 1 : -1;
    });

    return rows;
  }

  async updateBill(
    actor: AccessActor,
    appointmentId: string,
    input: { discountTotal?: number; status?: BillStatus; voidReason?: string },
  ) {
    await this.ensureAppointmentReadable(actor, appointmentId);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.appointmentBill.findUnique({ where: { appointmentId } });
      if (!existing) {
        await this.ensureBillInternal(tx as any, appointmentId);
      }
      const bill = await tx.appointmentBill.findUnique({ where: { appointmentId } });
      if (!bill) throw new NotFoundException('此預約尚未建立帳務');

      const data: any = {};
      if (input.discountTotal !== undefined) {
        const discountTotal = Math.max(0, Math.trunc(input.discountTotal));
        data.discountTotal = discountTotal;
        data.billTotal = Math.max(0, bill.listTotal - discountTotal);
      }

      if (input.status) {
        data.status = input.status;
        if (input.status === 'VOID') {
          data.voidReason = input.voidReason ?? bill.voidReason ?? null;
          data.voidedAt = new Date();
        }
        if (input.status !== 'VOID') {
          data.voidReason = null;
          data.voidedAt = null;
        }
      }

      await tx.appointmentBill.update({ where: { appointmentId }, data });
    });
    return this.getBillByAppointment(actor, appointmentId);
  }

  async updateBillById(
    actor: AccessActor,
    billId: string,
    input: { discountTotal?: number; status?: BillStatus; voidReason?: string },
  ) {
    await this.ensureBillReadable(actor, billId);
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.appointmentBill.findUnique({ where: { id: billId } });
      if (!bill) throw new NotFoundException('帳務不存在');

      const data: any = {};
      if (input.discountTotal !== undefined) {
        const discountTotal = Math.max(0, Math.trunc(input.discountTotal));
        data.discountTotal = discountTotal;
        data.billTotal = Math.max(0, bill.listTotal - discountTotal);
      }
      if (input.status) {
        data.status = input.status;
        if (input.status === 'VOID') {
          data.voidReason = input.voidReason ?? bill.voidReason ?? null;
          data.voidedAt = new Date();
        } else {
          data.voidReason = null;
          data.voidedAt = null;
        }
      }

      await tx.appointmentBill.update({ where: { id: billId }, data });
      return this.getBillById(actor, billId);
    });
  }

  async createManualBill(
    actor: AccessActor,
    input: {
      branchId: string;
      billType: string;
      customerId?: string | null;
      customerNameSnapshot?: string | null;
      customerPhoneSnapshot?: string | null;
      artistId?: string | null;
      currency?: string;
      items: Array<{
        serviceId?: string | null;
        nameSnapshot: string;
        basePriceSnapshot: number;
        finalPriceSnapshot: number;
        variantsSnapshot?: any;
        notes?: string | null;
        sortOrder?: number;
      }>;
      discountTotal?: number;
      notes?: string | null;
    },
  ) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can create manual bills');
    if (!input.branchId) throw new BadRequestException('branchId is required');
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException('items is required');
    }

    const mappedItems = input.items.map((it, idx) => ({
      serviceId: it.serviceId ?? null,
      nameSnapshot: String(it.nameSnapshot ?? '項目'),
      basePriceSnapshot: Math.max(0, Math.trunc(Number(it.basePriceSnapshot ?? 0))),
      finalPriceSnapshot: Math.max(0, Math.trunc(Number(it.finalPriceSnapshot ?? 0))),
      variantsSnapshot: it.variantsSnapshot ?? null,
      notes: it.notes ?? null,
      sortOrder: Number.isInteger(it.sortOrder) ? (it.sortOrder as number) : idx,
    }));

    const listTotal = mappedItems.reduce((s, it) => s + it.basePriceSnapshot, 0);
    const derivedBillTotal = mappedItems.reduce((s, it) => s + it.finalPriceSnapshot, 0);
    const discountTotal =
      input.discountTotal !== undefined ? Math.max(0, Math.trunc(input.discountTotal)) : Math.max(0, listTotal - derivedBillTotal);
    const billTotal = Math.max(0, listTotal - discountTotal);

    const bill = await this.prisma.appointmentBill.create({
      data: {
        appointmentId: null,
        branchId: input.branchId,
        customerId: input.customerId ?? null,
        artistId: input.artistId ?? null,
        currency: input.currency ?? 'TWD',
        billType: input.billType || 'WALK_IN',
        customerNameSnapshot: input.customerNameSnapshot ?? null,
        customerPhoneSnapshot: input.customerPhoneSnapshot ?? null,
        createdById: actor.id,
        listTotal,
        discountTotal,
        billTotal,
        status: 'OPEN',
        voidReason: null,
        voidedAt: null,
        items: {
          create: mappedItems.map((it) => ({
            serviceId: it.serviceId,
            nameSnapshot: it.nameSnapshot,
            basePriceSnapshot: it.basePriceSnapshot,
            finalPriceSnapshot: it.finalPriceSnapshot,
            variantsSnapshot: it.variantsSnapshot,
            notes: it.notes,
            sortOrder: it.sortOrder,
          })),
        },
      },
    });

    return this.getBillById(actor, bill.id);
  }

  async recordPaymentByBillId(
    actor: AccessActor,
    billId: string,
    input: { amount: number; method: string; paidAt?: Date; notes?: string },
  ) {
    await this.ensureBillReadable(actor, billId);

    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.appointmentBill.findUnique({
        where: { id: billId },
        include: { payments: { include: { allocations: true } } },
      });
      if (!bill) throw new NotFoundException('帳務不存在');

      const paidAt = input.paidAt ?? new Date();
      const amount = Math.trunc(input.amount);
      if (amount === 0) throw new BadRequestException('amount must be non-zero');

      const method = input.method.toUpperCase();
      const member = bill.customerId
        ? await tx.member.findUnique({ where: { userId: bill.customerId } })
        : null;
      const countTotalSpent = !!member && bill.billType !== BILL_TYPE_STORED_VALUE_TOPUP;

      if (method === 'STORED_VALUE') {
        if (!bill.customerId) throw new BadRequestException('此帳務未綁定會員，無法使用儲值金付款');
        if (!member) throw new BadRequestException('此會員尚未建立儲值帳戶');
        const nextBalance = member.balance - amount;
        if (amount > 0 && nextBalance < 0) throw new BadRequestException('儲值餘額不足');
        const memberUpdate: Prisma.MemberUpdateInput = {
          balance: nextBalance,
          ...(countTotalSpent ? { totalSpent: { increment: amount } } : {}),
        };
        await tx.member.update({
          where: { userId: bill.customerId },
          data: memberUpdate,
        });
        await tx.topupHistory.create({
          data: {
            memberId: member.id,
            operatorId: actor.id,
            amount: Math.abs(amount),
            type: amount > 0 ? 'SPEND' : 'TOPUP',
          },
        });
      }

      const payment = await tx.payment.create({
        data: {
          billId: bill.id,
          amount,
          method,
          paidAt,
          recordedById: actor.id,
          notes: input.notes ?? null,
        },
      });

      // For non-stored-value payments, still keep Member.totalSpent in sync with Billing payments.
      if (method !== 'STORED_VALUE' && countTotalSpent && member) {
        await tx.member.update({
          where: { id: member.id },
          data: { totalSpent: { increment: amount } },
        });
      }

      // If no artist, allocate all to SHOP.
      if (!bill.artistId) {
        await tx.paymentAllocation.createMany({
          data: [
            { paymentId: payment.id, target: 'ARTIST', amount: 0 },
            { paymentId: payment.id, target: 'SHOP', amount: amount },
          ],
        });
      } else {
        const split = await this.resolveSplitRule(actor, bill.artistId, bill.branchId, paidAt);
        const artistAmount = roundHalfUp((amount * split.artistRateBps) / 10000);
        const shopAmount = amount - artistAmount;
        await tx.paymentAllocation.createMany({
          data: [
            { paymentId: payment.id, target: 'ARTIST', amount: artistAmount },
            { paymentId: payment.id, target: 'SHOP', amount: shopAmount },
          ],
        });
      }

      const paidTotal = (await tx.payment.aggregate({ where: { billId: bill.id }, _sum: { amount: true } }))._sum.amount || 0;
      const nextStatus: BillStatus = bill.status === 'VOID' ? 'VOID' : paidTotal >= bill.billTotal ? 'SETTLED' : 'OPEN';
      if (nextStatus !== bill.status) {
        await tx.appointmentBill.update({ where: { id: bill.id }, data: { status: nextStatus } });
      }

      return this.getBillById(actor, billId);
    });
  }

  async recordPayment(
    actor: AccessActor,
    appointmentId: string,
    input: { amount: number; method: string; paidAt?: Date; notes?: string },
  ) {
    await this.ensureAppointmentReadable(actor, appointmentId);

    return this.prisma.$transaction(async (tx) => {
      let bill = await tx.appointmentBill.findUnique({
        where: { appointmentId },
        include: { payments: { include: { allocations: true } } },
      });
      if (!bill) {
        await this.ensureBillInternal(tx, appointmentId, actor.id);
        bill = await tx.appointmentBill.findUnique({
          where: { appointmentId },
          include: { payments: { include: { allocations: true } } },
        });
      }
      if (!bill) throw new NotFoundException('此預約尚未建立帳務');

      const paidAt = input.paidAt ?? new Date();
      const amount = Math.trunc(input.amount);
      if (amount === 0) throw new BadRequestException('amount must be non-zero');

      // Stored value: update member balance + history as part of payment recording.
      const method = input.method.toUpperCase();
      const member = bill.customerId
        ? await tx.member.findUnique({ where: { userId: bill.customerId } })
        : null;
      const countTotalSpent = !!member && bill.billType !== BILL_TYPE_STORED_VALUE_TOPUP;

      if (method === 'STORED_VALUE') {
        if (!member) throw new BadRequestException('此會員尚未建立儲值帳戶');
        const nextBalance = member.balance - amount;
        if (amount > 0 && nextBalance < 0) throw new BadRequestException('儲值餘額不足');
        const memberUpdate: Prisma.MemberUpdateInput = {
          balance: nextBalance,
          ...(countTotalSpent ? { totalSpent: { increment: amount } } : {}),
        };
        await tx.member.update({
          where: { userId: bill.customerId },
          data: memberUpdate,
        });
        await tx.topupHistory.create({
          data: {
            memberId: member.id,
            operatorId: actor.id,
            amount: Math.abs(amount),
            type: amount > 0 ? 'SPEND' : 'TOPUP',
          },
        });
      }

      const payment = await tx.payment.create({
        data: {
          billId: bill.id,
          amount,
          method,
          paidAt,
          recordedById: actor.id,
          notes: input.notes ?? null,
        },
      });

      // For non-stored-value payments, still keep Member.totalSpent in sync with Billing payments.
      if (method !== 'STORED_VALUE' && countTotalSpent && member) {
        await tx.member.update({
          where: { id: member.id },
          data: { totalSpent: { increment: amount } },
        });
      }

      // Compute allocations for this payment (hybrid: based on remaining target totals)
      const split = await this.resolveSplitRule(actor, bill.artistId, bill.branchId, paidAt);
      const targetArtistTotal = roundHalfUp((bill.billTotal * split.artistRateBps) / 10000);
      const targetShopTotal = bill.billTotal - targetArtistTotal;

      const prevAlloc = await tx.paymentAllocation.findMany({
        where: { payment: { billId: bill.id } },
        select: { target: true, amount: true },
      });

      const allocatedArtist = prevAlloc.filter((a) => a.target === 'ARTIST').reduce((s, a) => s + a.amount, 0);
      const allocatedShop = prevAlloc.filter((a) => a.target === 'SHOP').reduce((s, a) => s + a.amount, 0);

      let artistAmount = 0;
      let shopAmount = 0;

      if (amount > 0) {
        const remainingArtist = targetArtistTotal - allocatedArtist;
        const remainingShop = targetShopTotal - allocatedShop;
        const totalRemaining = remainingArtist + remainingShop;
        if (totalRemaining > 0) {
          artistAmount = roundHalfUp((amount * remainingArtist) / totalRemaining);
          artistAmount = clampInt(artistAmount, 0, amount);
          shopAmount = amount - artistAmount;
          // Clamp to not exceed remaining buckets (final payment absorbs rounding)
          if (shopAmount > remainingShop) {
            shopAmount = Math.max(0, remainingShop);
            artistAmount = amount - shopAmount;
          }
          if (artistAmount > remainingArtist) {
            artistAmount = Math.max(0, remainingArtist);
            shopAmount = amount - artistAmount;
          }
        } else {
          // Overpayment: use configured split
          artistAmount = roundHalfUp((amount * split.artistRateBps) / 10000);
          shopAmount = amount - artistAmount;
        }
      } else {
        // Refund/chargeback: reverse using configured split (simple & consistent)
        artistAmount = roundHalfUp((amount * split.artistRateBps) / 10000);
        shopAmount = amount - artistAmount;
      }

      await tx.paymentAllocation.createMany({
        data: [
          { paymentId: payment.id, target: 'ARTIST', amount: artistAmount },
          { paymentId: payment.id, target: 'SHOP', amount: shopAmount },
        ],
      });

      // Update bill status based on paid progress
      const paidTotal = (await tx.payment.aggregate({ where: { billId: bill.id }, _sum: { amount: true } }))._sum.amount || 0;
      const nextStatus: BillStatus =
        bill.status === 'VOID' ? 'VOID' : paidTotal >= bill.billTotal ? 'SETTLED' : 'OPEN';
      if (nextStatus !== bill.status) {
        await tx.appointmentBill.update({ where: { id: bill.id }, data: { status: nextStatus } });
      }

      return this.getBillByAppointment(actor, appointmentId);
    });
  }

  async listSplitRules(actor: AccessActor, input: { artistId?: string; branchId?: string }) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can manage split rules');
    const where: Prisma.ArtistSplitRuleWhereInput = {};
    if (input.artistId) where.artistId = input.artistId;
    if (input.branchId) where.branchId = input.branchId;
    return this.prisma.artistSplitRule.findMany({
      where,
      orderBy: [{ artistId: 'asc' }, { branchId: 'desc' }, { effectiveFrom: 'desc' }],
      include: { artist: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } },
    });
  }

  async upsertSplitRule(
    actor: AccessActor,
    input: { artistId: string; branchId: string | null; artistRateBps: number; effectiveFrom?: Date },
  ) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can manage split rules');
    const artistRateBps = clampInt(Math.trunc(input.artistRateBps), 0, 10000);
    const shopRateBps = 10000 - artistRateBps;
    
    // 先查找同一 artistId + branchId 的最新規則
    const existing = await this.prisma.artistSplitRule.findFirst({
      where: {
        artistId: input.artistId,
        branchId: input.branchId,
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (existing) {
      // 更新既有規則（覆蓋）
      return this.prisma.artistSplitRule.update({
        where: { id: existing.id },
        data: {
          artistRateBps,
          shopRateBps,
          effectiveFrom: input.effectiveFrom ?? new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      // 建立新規則
      return this.prisma.artistSplitRule.create({
        data: {
          artistId: input.artistId,
          branchId: input.branchId,
          artistRateBps,
          shopRateBps,
          effectiveFrom: input.effectiveFrom ?? new Date(),
        },
      });
    }
  }

  async getReports(
    actor: AccessActor,
    input: { branchId?: string; artistId?: string; view?: 'CONSUMPTION' | 'ALL'; startDate?: string; endDate?: string },
  ) {
    // BOSS sees all; ARTIST sees own branch + own bills
    const start = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = input.endDate ? new Date(input.endDate) : new Date();

    const billWhere: Prisma.AppointmentBillWhereInput = {};
    if (isBoss(actor)) {
      if (input.branchId && input.branchId !== 'all') billWhere.branchId = input.branchId;
      if (input.artistId && input.artistId !== 'all') billWhere.artistId = input.artistId;
    } else {
      billWhere.branchId = actor.branchId ?? undefined;
      billWhere.artistId = actor.id;
    }
    if (input.view === 'CONSUMPTION') {
      billWhere.billType = { not: BILL_TYPE_STORED_VALUE_TOPUP } as any;
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        paidAt: { gte: start, lte: end },
        bill: billWhere,
      },
      include: {
        bill: { select: { id: true, branchId: true, artistId: true } },
        allocations: true,
      },
    });

    const revenue = payments.reduce((s, p) => s + p.amount, 0);
    const byMethod: Record<string, { method: string; amount: number; count: number }> = {};
    const byTarget: Record<string, { target: string; amount: number }> = {};
    const byArtist: Record<string, { artistId: string; amount: number }> = {};

    for (const p of payments) {
      const m = p.method || 'UNKNOWN';
      byMethod[m] = byMethod[m] || { method: m, amount: 0, count: 0 };
      byMethod[m].amount += p.amount;
      byMethod[m].count += 1;

      for (const a of p.allocations) {
        byTarget[a.target] = byTarget[a.target] || { target: a.target, amount: 0 };
        byTarget[a.target].amount += a.amount;
      }

      if (p.bill.artistId) {
        byArtist[p.bill.artistId] = byArtist[p.bill.artistId] || { artistId: p.bill.artistId, amount: 0 };
        const artistAlloc = p.allocations.find((x) => x.target === 'ARTIST')?.amount ?? 0;
        byArtist[p.bill.artistId].amount += artistAlloc;
      }
    }

    return {
      range: { start, end },
      revenue,
      byPaymentMethod: Object.values(byMethod).sort((a, b) => b.amount - a.amount),
      allocations: Object.values(byTarget),
      byArtist: Object.values(byArtist).sort((a, b) => b.amount - a.amount),
    };
  }

  /**
   * 重建帳單金額與明細（依 appointment.cartSnapshot）
   * 僅限 BOSS 使用，用於修正已建立的帳單
   */
  async rebuildBillFromCartSnapshot(actor: AccessActor, billId: string) {
    if (!isBoss(actor)) {
      throw new ForbiddenException('只有 BOSS 可以重建帳單');
    }

    await this.ensureBillReadable(actor, billId);

    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.appointmentBill.findUnique({
        where: { id: billId },
        include: {
          appointment: {
            select: { id: true, cartSnapshot: true, service: { select: { id: true, name: true, price: true } } },
          },
          items: true,
        },
      });

      if (!bill) throw new NotFoundException('帳單不存在');
      if (!bill.appointmentId) throw new BadRequestException('此帳單未綁定預約，無法重建');
      if (!bill.appointment) throw new NotFoundException('預約不存在');

      // 從 cartSnapshot 計算新的金額與明細
      const cartDerived = this.computeTotalsFromCartSnapshot(bill.appointment.cartSnapshot);
      if (!cartDerived) {
        throw new BadRequestException('此預約沒有 cartSnapshot，無法重建帳單');
      }

      const { listTotal, billTotal, discountTotal, items: derivedItems } = cartDerived;

      // 刪除舊的帳單明細
      await tx.appointmentBillItem.deleteMany({
        where: { billId: bill.id },
      });

      // 建立新的帳單明細
      await tx.appointmentBillItem.createMany({
        data: derivedItems.map((it) => ({
          billId: bill.id,
          serviceId: it.serviceId ?? null,
          nameSnapshot: it.nameSnapshot,
          basePriceSnapshot: it.basePriceSnapshot,
          finalPriceSnapshot: it.finalPriceSnapshot,
          variantsSnapshot: it.variantsSnapshot ?? null,
          notes: it.notes ?? null,
          sortOrder: it.sortOrder,
        })),
      });

      // 更新帳單總金額
      await tx.appointmentBill.update({
        where: { id: bill.id },
        data: {
          listTotal,
          billTotal,
          discountTotal,
        },
      });

      // 重新計算帳單狀態
      const paidTotal = (await tx.payment.aggregate({ where: { billId: bill.id }, _sum: { amount: true } }))._sum.amount || 0;
      const nextStatus: BillStatus = bill.status === 'VOID' ? 'VOID' : paidTotal >= billTotal ? 'SETTLED' : 'OPEN';
      if (nextStatus !== bill.status) {
        await tx.appointmentBill.update({ where: { id: bill.id }, data: { status: nextStatus } });
      }

      console.log(`✅ 重建帳單 ${billId}：listTotal=${listTotal}, billTotal=${billTotal}, discountTotal=${discountTotal}, items=${derivedItems.length}`);

      return { billId: bill.id, listTotal, billTotal, discountTotal, itemsCount: derivedItems.length };
    });
  }

  /**
   * 批次重建帳單（依條件篩選）
   * 僅限 BOSS 使用
   */
  async rebuildBillsBatch(actor: AccessActor, input?: { appointmentIds?: string[] }) {
    if (!isBoss(actor)) {
      throw new ForbiddenException('只有 BOSS 可以批次重建帳單');
    }

    // 找出符合條件的帳單：
    // 1. 有 appointment.cartSnapshot
    // 2. 有 bill
    // 3. 金額明顯來自單一 service（例如 billTotal == service.price）
    const appointments = await this.prisma.appointment.findMany({
      where: {
        id: input?.appointmentIds ? { in: input.appointmentIds } : undefined,
        cartSnapshot: { not: null },
        bill: { isNot: null },
      },
      select: {
        id: true,
        cartSnapshot: true,
        service: { select: { id: true, name: true, price: true } },
        bill: { select: { id: true, billTotal: true, items: true } },
      },
    });

    const rebuiltBills: string[] = [];
    const errors: Array<{ appointmentId: string; error: string }> = [];

    for (const appt of appointments) {
      try {
        if (!appt.bill) continue;

        // 檢查是否需要重建：bill.items 只有 1 筆且等於 service.price
        const shouldRebuild =
          appt.bill.items.length === 1 &&
          appt.bill.billTotal === appt.service?.price;

        if (shouldRebuild) {
          await this.rebuildBillFromCartSnapshot(actor, appt.bill.id);
          rebuiltBills.push(appt.bill.id);
        }
      } catch (error) {
        errors.push({
          appointmentId: appt.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      total: appointments.length,
      rebuilt: rebuiltBills.length,
      skipped: appointments.length - rebuiltBills.length - errors.length,
      errors: errors.length,
      rebuiltBillIds: rebuiltBills,
      errorDetails: errors,
    };
  }

  /**
   * 批次重算歷史 payment allocations（依最新拆帳規則）
   * 僅限 BOSS 使用，會覆蓋所有歷史 allocations
   * 方案 A：一律使用「目前最新」規則，不看 paidAt/effectiveFrom
   */
  async recomputeAllPaymentAllocations(actor: AccessActor, input?: { paymentIds?: string[] }) {
    if (!isBoss(actor)) {
      throw new ForbiddenException('只有 BOSS 可以重算拆帳');
    }

    // 找出所有需要重算的 payments
    const payments = await this.prisma.payment.findMany({
      where: {
        id: input?.paymentIds ? { in: input.paymentIds } : undefined,
      },
      include: {
        bill: {
          select: { id: true, artistId: true, branchId: true, appointmentId: true },
        },
        allocations: true,
      },
      orderBy: { paidAt: 'asc' },
    });

    const recomputed: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ paymentId: string; error: string }> = [];

    for (const payment of payments) {
      try {
        // 如果沒有 artistId 或 branchId，無法計算拆帳，跳過
        if (!payment.bill.artistId || !payment.bill.branchId) {
          skipped.push(payment.id);
          continue;
        }

        // 取得「目前最新」的拆帳規則（不看 paidAt，直接取最新）
        // 先找該 artistId + branchId 的最新規則
        const rules = await this.prisma.artistSplitRule.findMany({
          where: {
            artistId: payment.bill.artistId,
            OR: [
              { branchId: payment.bill.branchId },
              { branchId: null }, // global fallback
            ],
          },
          orderBy: [
            { branchId: 'desc' }, // branch-specific first
            { effectiveFrom: 'desc' }, // then latest
          ],
          take: 1,
        });

        const rule = rules[0];
        let split = { artistRateBps: 7000, shopRateBps: 3000 }; // default
        if (rule) {
          const artistRateBps = clampInt(rule.artistRateBps, 0, 10000);
          const shopRateBps = clampInt(rule.shopRateBps, 0, 10000);
          const sum = artistRateBps + shopRateBps;
          if (sum !== 10000 && sum > 0) {
            const normalizedArtist = roundHalfUp((artistRateBps / sum) * 10000);
            split = { artistRateBps: normalizedArtist, shopRateBps: 10000 - normalizedArtist };
          } else {
            split = { artistRateBps, shopRateBps };
          }
        }

        // 計算新的拆帳金額
        const artistAmount = roundHalfUp((payment.amount * split.artistRateBps) / 10000);
        const shopAmount = payment.amount - artistAmount;

        // 刪除舊的 allocations
        await this.prisma.paymentAllocation.deleteMany({
          where: { paymentId: payment.id },
        });

        // 建立新的 allocations
        await this.prisma.paymentAllocation.createMany({
          data: [
            { paymentId: payment.id, target: 'ARTIST', amount: artistAmount },
            { paymentId: payment.id, target: 'SHOP', amount: shopAmount },
          ],
        });

        recomputed.push(payment.id);
        console.log(`✅ 重算拆帳 Payment ${payment.id}：artist=${artistAmount}, shop=${shopAmount} (${split.artistRateBps / 100}% / ${split.shopRateBps / 100}%)`);
      } catch (error) {
        errors.push({
          paymentId: payment.id,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`❌ 重算拆帳失敗 Payment ${payment.id}:`, error);
      }
    }

    return {
      total: payments.length,
      recomputed: recomputed.length,
      skipped: skipped.length,
      errors: errors.length,
      recomputedPaymentIds: recomputed,
      skippedPaymentIds: skipped,
      errorDetails: errors,
    };
  }
}


