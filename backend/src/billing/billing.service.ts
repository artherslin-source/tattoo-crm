import { BadRequestException, ForbiddenException, NotFoundException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isBoss, isArtist, type AccessActor } from '../common/access/access.types';

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

  private async ensureBillInternal(tx: Prisma.TransactionClient, appointmentId: string) {
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

    // Upsert bill
    const bill = await tx.appointmentBill.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        branchId: appointment.branchId,
        customerId: appointment.userId,
        artistId: appointment.artistId ?? null,
        currency: 'TWD',
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
      update: {},
      include: { items: true },
    });

    // If bill existed, ensure it has items; otherwise keep as-is (avoid overwriting manual edits).
    if (bill.items.length === 0) {
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
    return this.prisma.$transaction(async (tx) => {
      await this.ensureBillInternal(tx, appointmentId);
      return this.getBillByAppointment(actor, appointmentId);
    });
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
          include: { allocations: true },
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
      startDate?: string;
      endDate?: string;
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

    if (query.startDate || query.endDate) {
      const start = query.startDate ? new Date(query.startDate) : undefined;
      const end = query.endDate ? new Date(query.endDate) : undefined;
      where.createdAt = {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      };
    }

    if (query.customerSearch && query.customerSearch.trim() !== '') {
      const q = query.customerSearch.trim();
      where.customer = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const bills = await this.prisma.appointmentBill.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        appointment: {
          select: { id: true, startAt: true, endAt: true, status: true },
        },
        customer: { select: { id: true, name: true, phone: true } },
        artist: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        payments: { select: { amount: true } },
      },
    });

    return bills.map((b) => {
      const paidTotal = b.payments.reduce((s, p) => s + p.amount, 0);
      return {
        ...b,
        summary: {
          paidTotal,
          dueTotal: b.billTotal - paidTotal,
        },
      };
    });
  }

  async updateBill(
    actor: AccessActor,
    appointmentId: string,
    input: { discountTotal?: number; status?: BillStatus; voidReason?: string },
  ) {
    await this.ensureAppointmentReadable(actor, appointmentId);

    return this.prisma.$transaction(async (tx) => {
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
      return this.getBillByAppointment(actor, appointmentId);
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
        await this.ensureBillInternal(tx, appointmentId);
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
      if (method === 'STORED_VALUE') {
        const member = await tx.member.findUnique({ where: { userId: bill.customerId } });
        if (!member) throw new BadRequestException('此會員尚未建立儲值帳戶');
        const nextBalance = member.balance - amount;
        if (amount > 0 && nextBalance < 0) throw new BadRequestException('儲值餘額不足');
        await tx.member.update({
          where: { userId: bill.customerId },
          data: { balance: nextBalance },
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

  async getReports(
    actor: AccessActor,
    input: { branchId?: string; artistId?: string; startDate?: string; endDate?: string },
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
}


