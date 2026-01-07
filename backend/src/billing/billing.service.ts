import { BadRequestException, ForbiddenException, NotFoundException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isBoss, isArtist, type AccessActor } from '../common/access/access.types';
import { BILL_TYPE_STORED_VALUE_TOPUP } from './billing.constants';
import * as ExcelJS from 'exceljs';

type BillStatus = 'OPEN' | 'SETTLED' | 'VOID';

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundHalfUp(n: number) {
  return Math.round(n);
}

function sumAddonMoneyFromVariantsSnapshot(v: any): number {
  if (!v || typeof v !== 'object') return 0;
  const NON_MONEY_KEYS = new Set([
    'side',
    'color',
    'size',
    'position',
    'style',
    'complexity',
    'technique',
  ]);
  let sum = 0;
  for (const [k, raw] of Object.entries(v)) {
    if (NON_MONEY_KEYS.has(k)) continue;
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    if (!Number.isFinite(n)) continue;
    if (n <= 0) continue;
    sum += Math.round(n);
  }
  return sum;
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  private computeOppositeTopupHistoryType(type: string): 'TOPUP' | 'SPEND' {
    return String(type).toUpperCase() === 'SPEND' ? 'TOPUP' : 'SPEND';
  }

  private async deleteMatchingTopupHistoryOrCompensate(
    tx: Prisma.TransactionClient,
    input: {
      memberId: string;
      operatorIds: Array<string | null | undefined>;
      amountAbs: number;
      expectedType: 'TOPUP' | 'SPEND';
      at: Date;
      compensateOperatorId: string;
    },
  ): Promise<{ deletedId?: string; compensated?: { type: 'TOPUP' | 'SPEND'; amount: number } }> {
    const opIds = input.operatorIds.filter(Boolean) as string[];
    const windowMs = 10 * 60 * 1000;
    const start = new Date(input.at.getTime() - windowMs);
    const end = new Date(input.at.getTime() + windowMs);

    const candidates = await tx.topupHistory.findMany({
      where: {
        memberId: input.memberId,
        amount: input.amountAbs,
        type: input.expectedType,
        ...(opIds.length > 0 ? { operatorId: { in: opIds } } : {}),
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (candidates.length > 0) {
      // Pick the closest createdAt to the payment time
      let best = candidates[0];
      let bestDiff = Math.abs(best.createdAt.getTime() - input.at.getTime());
      for (const c of candidates) {
        const d = Math.abs(c.createdAt.getTime() - input.at.getTime());
        if (d < bestDiff) {
          best = c;
          bestDiff = d;
        }
      }
      await tx.topupHistory.delete({ where: { id: best.id } });
      return { deletedId: best.id };
    }

    // No deterministic match; create compensating history entry to keep ledger consistent.
    const opposite = this.computeOppositeTopupHistoryType(input.expectedType);
    await tx.topupHistory.create({
      data: {
        memberId: input.memberId,
        operatorId: input.compensateOperatorId,
        amount: input.amountAbs,
        type: opposite,
      },
    });
    return { compensated: { type: opposite, amount: input.amountAbs } };
  }

  private async reverseBillSideEffects(
    tx: Prisma.TransactionClient,
    input: {
      bill: Prisma.AppointmentBillGetPayload<{
        include: { payments: true };
      }>;
      actor: AccessActor;
    },
  ) {
    const bill = input.bill;
    if (!bill.customerId) return { applied: false as const };

    const member = await tx.member.findUnique({ where: { userId: bill.customerId } });
    if (!member) return { applied: false as const };

    let balanceDelta = 0;
    let totalSpentDelta = 0;
    let topupHistoryDeleted = 0;
    let topupHistoryCompensated = 0;

    const payments = bill.payments || [];
    const billType = bill.billType;

    if (billType === BILL_TYPE_STORED_VALUE_TOPUP) {
      // Topup bill increased balance by payment amounts; reverse by decrementing
      const topupSum = payments.reduce((s, p) => s + (p.amount || 0), 0);
      balanceDelta -= topupSum;

      for (const p of payments) {
        const amountAbs = Math.abs(p.amount || 0);
        const res = await this.deleteMatchingTopupHistoryOrCompensate(tx, {
          memberId: member.id,
          operatorIds: [p.recordedById, bill.createdById, input.actor.id],
          amountAbs,
          expectedType: 'TOPUP',
          at: p.paidAt ?? new Date(),
          compensateOperatorId: input.actor.id,
        });
        if (res.deletedId) topupHistoryDeleted += 1;
        if (res.compensated) topupHistoryCompensated += 1;
      }
    } else {
      // Consumption / other bills: totalSpent was incremented by payment amounts; reverse it.
      const paidSum = payments.reduce((s, p) => s + (p.amount || 0), 0);
      totalSpentDelta -= paidSum;

      for (const p of payments) {
        if (String(p.method || '').toUpperCase() !== 'STORED_VALUE') continue;
        // Stored value payment changed member balance: nextBalance = balance - amount
        balanceDelta += p.amount || 0;

        const expectedType: 'TOPUP' | 'SPEND' = (p.amount || 0) > 0 ? 'SPEND' : 'TOPUP';
        const amountAbs = Math.abs(p.amount || 0);
        const res = await this.deleteMatchingTopupHistoryOrCompensate(tx, {
          memberId: member.id,
          operatorIds: [p.recordedById, bill.createdById, input.actor.id],
          amountAbs,
          expectedType,
          at: p.paidAt ?? new Date(),
          compensateOperatorId: input.actor.id,
        });
        if (res.deletedId) topupHistoryDeleted += 1;
        if (res.compensated) topupHistoryCompensated += 1;
      }
    }

    if (balanceDelta !== 0 || totalSpentDelta !== 0) {
      await tx.member.update({
        where: { id: member.id },
        data: {
          ...(balanceDelta !== 0 ? { balance: { increment: balanceDelta } } : {}),
          ...(totalSpentDelta !== 0 ? { totalSpent: { increment: totalSpentDelta } } : {}),
        },
      });
    }

    return {
      applied: true as const,
      memberId: member.id,
      balanceDelta,
      totalSpentDelta,
      topupHistoryDeleted,
      topupHistoryCompensated,
    };
  }

  private async applyBillSideEffects(
    tx: Prisma.TransactionClient,
    input: {
      bill: Prisma.AppointmentBillGetPayload<{
        include: { payments: true };
      }>;
      actor: AccessActor;
    },
  ) {
    const bill = input.bill;
    if (!bill.customerId) return { applied: false as const };

    const member = await tx.member.findUnique({ where: { userId: bill.customerId } });
    if (!member) return { applied: false as const };

    let balanceDelta = 0;
    let totalSpentDelta = 0;
    let topupHistoryCreated = 0;

    const payments = bill.payments || [];
    const billType = bill.billType;

    if (billType === BILL_TYPE_STORED_VALUE_TOPUP) {
      const topupSum = payments.reduce((s, p) => s + (p.amount || 0), 0);
      balanceDelta += topupSum;
      for (const p of payments) {
        const amountAbs = Math.abs(p.amount || 0);
        await tx.topupHistory.create({
          data: {
            memberId: member.id,
            operatorId: input.actor.id,
            amount: amountAbs,
            type: 'TOPUP',
          },
        });
        topupHistoryCreated += 1;
      }
    } else {
      // Keep totalSpent aligned with billing payments (same as recordPayment/recordPaymentByBillId)
      const paidSum = payments.reduce((s, p) => s + (p.amount || 0), 0);
      totalSpentDelta += paidSum;

      for (const p of payments) {
        if (String(p.method || '').toUpperCase() !== 'STORED_VALUE') continue;
        balanceDelta -= p.amount || 0;
        const type: 'TOPUP' | 'SPEND' = (p.amount || 0) > 0 ? 'SPEND' : 'TOPUP';
        const amountAbs = Math.abs(p.amount || 0);
        await tx.topupHistory.create({
          data: {
            memberId: member.id,
            operatorId: input.actor.id,
            amount: amountAbs,
            type,
          },
        });
        topupHistoryCreated += 1;
      }
    }

    if (balanceDelta !== 0 || totalSpentDelta !== 0) {
      await tx.member.update({
        where: { id: member.id },
        data: {
          ...(balanceDelta !== 0 ? { balance: { increment: balanceDelta } } : {}),
          ...(totalSpentDelta !== 0 ? { totalSpent: { increment: totalSpentDelta } } : {}),
        },
      });
    }

    return {
      applied: true as const,
      memberId: member.id,
      balanceDelta,
      totalSpentDelta,
      topupHistoryCreated,
    };
  }

  async deleteBillHard(actor: AccessActor, billId: string, input: { reason: string }) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can delete bills');
    if (!input?.reason || input.reason.trim().length === 0) throw new BadRequestException('reason is required');

    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.appointmentBill.findUnique({
        where: { id: billId },
        include: {
          items: true,
          payments: { include: { allocations: true } },
        },
      });
      if (!bill) throw new NotFoundException('帳務不存在');

      const reverse = await this.reverseBillSideEffects(tx, {
        bill: { ...bill, payments: bill.payments } as any,
        actor,
      });

      const paymentIds = bill.payments.map((p) => p.id);

      // If other payments reference these payments as refunds, detach to avoid FK errors.
      if (paymentIds.length > 0) {
        await tx.payment.updateMany({
          where: { refundOfPaymentId: { in: paymentIds }, id: { notIn: paymentIds } },
          data: { refundOfPaymentId: null },
        });
      }

      await tx.paymentAllocation.deleteMany({
        where: paymentIds.length > 0 ? { paymentId: { in: paymentIds } } : { paymentId: '__none__' as any },
      });
      await tx.payment.deleteMany({
        where: paymentIds.length > 0 ? { id: { in: paymentIds } } : { id: '__none__' as any },
      });
      await tx.appointmentBillItem.deleteMany({ where: { billId: bill.id } });
      await tx.appointmentBill.delete({ where: { id: bill.id } });

      return {
        deletedBillId: bill.id,
        reason: input.reason,
        reversed: reverse,
      };
    });
  }

  async updateBillFull(
    actor: AccessActor,
    billId: string,
    input: {
      bill?: {
        branchId?: string;
        customerId?: string | null;
        artistId?: string | null;
        billType?: string;
        customerNameSnapshot?: string | null;
        customerPhoneSnapshot?: string | null;
        discountTotal?: number;
        status?: BillStatus;
        voidReason?: string | null;
      };
      items?: Array<{
        id?: string;
        serviceId?: string | null;
        nameSnapshot: string;
        basePriceSnapshot: number;
        finalPriceSnapshot: number;
        variantsSnapshot?: any;
        notes?: string | null;
        sortOrder?: number;
      }>;
      payments?: Array<{
        id?: string;
        amount: number;
        method: string;
        paidAt?: Date;
        recordedById?: string | null;
        notes?: string | null;
        allocations?: { artistAmount: number; shopAmount: number };
      }>;
      recomputeAllocations?: boolean;
    },
  ) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can fully edit bills');

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.appointmentBill.findUnique({
        where: { id: billId },
        include: {
          items: true,
          payments: { include: { allocations: true } },
        },
      });
      if (!existing) throw new NotFoundException('帳務不存在');

      // Reverse side-effects from old state first (based on current DB rows)
      const reverse = await this.reverseBillSideEffects(tx, {
        bill: { ...existing, payments: existing.payments } as any,
        actor,
      });

      // Header update
      // Use UncheckedUpdateInput to allow updating scalar FK fields directly (branchId/customerId/artistId).
      const billPatch: Prisma.AppointmentBillUncheckedUpdateInput = {};
      if (input.bill?.branchId !== undefined) (billPatch as any).branchId = input.bill.branchId;
      if (input.bill?.customerId !== undefined) (billPatch as any).customerId = input.bill.customerId;
      if (input.bill?.artistId !== undefined) (billPatch as any).artistId = input.bill.artistId;
      if (input.bill?.billType !== undefined) billPatch.billType = input.bill.billType;
      if (input.bill?.customerNameSnapshot !== undefined) billPatch.customerNameSnapshot = input.bill.customerNameSnapshot;
      if (input.bill?.customerPhoneSnapshot !== undefined) billPatch.customerPhoneSnapshot = input.bill.customerPhoneSnapshot;
      if (input.bill?.status !== undefined) {
        billPatch.status = input.bill.status as any;
        if (input.bill.status === 'VOID') {
          billPatch.voidReason = input.bill.voidReason ?? existing.voidReason ?? null;
          billPatch.voidedAt = new Date();
        } else {
          billPatch.voidReason = null;
          billPatch.voidedAt = null;
        }
      }
      if (Object.keys(billPatch).length > 0) {
        await tx.appointmentBill.update({ where: { id: existing.id }, data: billPatch });
      }

      // Items CRUD (replace-by-id semantics)
      if (input.items) {
        const keepIds = new Set(input.items.filter((i) => i.id).map((i) => i.id!));
        const toDelete = existing.items.filter((it) => !keepIds.has(it.id)).map((it) => it.id);
        if (toDelete.length > 0) {
          await tx.appointmentBillItem.deleteMany({ where: { id: { in: toDelete } } });
        }
        for (const it of input.items) {
          const sortOrder = Number.isInteger(it.sortOrder) ? (it.sortOrder as number) : 0;
          if (it.id) {
            await tx.appointmentBillItem.update({
              where: { id: it.id },
              data: {
                serviceId: it.serviceId ?? null,
                nameSnapshot: it.nameSnapshot,
                basePriceSnapshot: Math.max(0, Math.trunc(it.basePriceSnapshot)),
                finalPriceSnapshot: Math.max(0, Math.trunc(it.finalPriceSnapshot)),
                variantsSnapshot: it.variantsSnapshot ?? null,
                notes: it.notes ?? null,
                sortOrder,
              },
            });
          } else {
            await tx.appointmentBillItem.create({
              data: {
                billId: existing.id,
                serviceId: it.serviceId ?? null,
                nameSnapshot: it.nameSnapshot,
                basePriceSnapshot: Math.max(0, Math.trunc(it.basePriceSnapshot)),
                finalPriceSnapshot: Math.max(0, Math.trunc(it.finalPriceSnapshot)),
                variantsSnapshot: it.variantsSnapshot ?? null,
                notes: it.notes ?? null,
                sortOrder,
              },
            });
          }
        }
      }

      // Payments CRUD
      if (input.payments) {
        const keepIds = new Set(input.payments.filter((p) => p.id).map((p) => p.id!));
        const toDelete = existing.payments.filter((p) => !keepIds.has(p.id)).map((p) => p.id);
        if (toDelete.length > 0) {
          // detach refunds in kept payments
          await tx.payment.updateMany({
            where: { refundOfPaymentId: { in: toDelete }, id: { notIn: toDelete } },
            data: { refundOfPaymentId: null },
          });
          await tx.paymentAllocation.deleteMany({ where: { paymentId: { in: toDelete } } });
          await tx.payment.deleteMany({ where: { id: { in: toDelete } } });
        }

        for (const p of input.payments) {
          const paidAt = p.paidAt ?? new Date();
          const method = String(p.method).toUpperCase();
          if (p.id) {
            await tx.payment.update({
              where: { id: p.id },
              data: {
                amount: Math.trunc(p.amount),
                method,
                paidAt,
                recordedById: p.recordedById ?? existing.createdById ?? actor.id,
                notes: p.notes ?? null,
              },
            });
          } else {
            await tx.payment.create({
              data: {
                billId: existing.id,
                amount: Math.trunc(p.amount),
                method,
                paidAt,
                recordedById: p.recordedById ?? existing.createdById ?? actor.id,
                notes: p.notes ?? null,
              },
            });
          }
        }
      }

      // Reload current bill state after CRUD
      const current = await tx.appointmentBill.findUnique({
        where: { id: existing.id },
        include: {
          items: true,
          payments: { include: { allocations: true } },
        },
      });
      if (!current) throw new NotFoundException('帳務不存在');

      // Recompute totals from items
      const listTotal = current.items.reduce((s, it) => s + it.basePriceSnapshot, 0);
      const derivedBillTotal = current.items.reduce((s, it) => s + it.finalPriceSnapshot, 0);
      const discountTotal =
        input.bill?.discountTotal !== undefined
          ? Math.max(0, Math.trunc(input.bill.discountTotal))
          : Math.max(0, listTotal - derivedBillTotal);
      const billTotal = Math.max(0, listTotal - discountTotal);

      // Update totals
      await tx.appointmentBill.update({
        where: { id: current.id },
        data: { listTotal, discountTotal, billTotal },
      });

      // Allocations: recompute or apply manual per payment
      const updatedBill = await tx.appointmentBill.findUnique({
        where: { id: current.id },
        include: {
          payments: { include: { allocations: true } },
        },
      });
      if (!updatedBill) throw new NotFoundException('帳務不存在');

      const byInputPaymentId = new Map<string, any>();
      for (const p of input.payments ?? []) {
        if (p.id) byInputPaymentId.set(p.id, p);
      }

      for (const p of updatedBill.payments) {
        const method = String(p.method || '').toUpperCase();
        // Always enforce stored value allocations to 0/0
        if (method === 'STORED_VALUE') {
          await tx.paymentAllocation.deleteMany({ where: { paymentId: p.id } });
          await tx.paymentAllocation.createMany({
            data: [
              { paymentId: p.id, target: 'ARTIST', amount: 0 },
              { paymentId: p.id, target: 'SHOP', amount: 0 },
            ],
          });
          continue;
        }

        if (input.recomputeAllocations) {
          await tx.paymentAllocation.deleteMany({ where: { paymentId: p.id } });
          const split = await this.resolveSplitRule(actor, updatedBill.artistId, updatedBill.branchId, p.paidAt);
          if (!split) {
            await tx.paymentAllocation.createMany({
              data: [
                { paymentId: p.id, target: 'ARTIST', amount: 0 },
                { paymentId: p.id, target: 'SHOP', amount: 0 },
              ],
            });
          } else {
            const artistAmount = roundHalfUp((p.amount * split.artistRateBps) / 10000);
            const shopAmount = p.amount - artistAmount;
            await tx.paymentAllocation.createMany({
              data: [
                { paymentId: p.id, target: 'ARTIST', amount: artistAmount },
                { paymentId: p.id, target: 'SHOP', amount: shopAmount },
              ],
            });
          }
          continue;
        }

        const ip = byInputPaymentId.get(p.id);
        if (ip?.allocations) {
          const artistAmount = Math.trunc(ip.allocations.artistAmount);
          const shopAmount = Math.trunc(ip.allocations.shopAmount);
          await tx.paymentAllocation.upsert({
            where: { paymentId_target: { paymentId: p.id, target: 'ARTIST' } },
            create: { paymentId: p.id, target: 'ARTIST', amount: artistAmount },
            update: { amount: artistAmount },
          });
          await tx.paymentAllocation.upsert({
            where: { paymentId_target: { paymentId: p.id, target: 'SHOP' } },
            create: { paymentId: p.id, target: 'SHOP', amount: shopAmount },
            update: { amount: shopAmount },
          });
        }
      }

      // Recompute status if not explicitly set to VOID
      const after = await tx.appointmentBill.findUnique({
        where: { id: current.id },
        include: { payments: true, items: true },
      });
      if (!after) throw new NotFoundException('帳務不存在');
      const paidTotal = after.payments.reduce((s, p) => s + p.amount, 0);
      const computedStatus: BillStatus = after.status === 'VOID' ? 'VOID' : paidTotal >= after.billTotal ? 'SETTLED' : 'OPEN';
      if (input.bill?.status === undefined && computedStatus !== after.status) {
        await tx.appointmentBill.update({ where: { id: after.id }, data: { status: computedStatus } });
      }

      // Apply side-effects based on new state (after CRUD + totals)
      const finalBill = await tx.appointmentBill.findUnique({
        where: { id: after.id },
        include: { payments: true },
      });
      if (!finalBill) throw new NotFoundException('帳務不存在');
      const applied = await this.applyBillSideEffects(tx, { bill: finalBill as any, actor });

      return {
        id: after.id,
        reversed: reverse,
        applied,
        bill: await this.getBillById(actor, after.id),
      };
    });
  }

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
        select: { id: true, name: true, phone: true, branchId: true, primaryArtistId: true },
      });
      if (!user) throw new NotFoundException('會員不存在');

      const branchId = input.branchId ?? user.branchId ?? actor.branchId ?? null;
      if (!branchId) throw new BadRequestException('無法判定分店（請提供 branchId 或先為會員指定分店）');

      if (!user.primaryArtistId) {
        throw new BadRequestException('此會員尚未設定主責刺青師，請先設定後再進行儲值入金');
      }

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
          artistId: user.primaryArtistId,
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

      const paidAt = new Date();
      const payment = await tx.payment.create({
        data: {
          billId: bill.id,
          amount,
          method,
          paidAt,
          recordedById: actor.id,
          notes: `${input.notes || '會員儲值'} (topupHistoryId=${history.id})`,
        },
      });

      // Topup allocations are attributed to member's primary artist.
      // If no split rule: ARTIST=0, SHOP=amount
      const split = await this.resolveSplitRule(actor, user.primaryArtistId, branchId, paidAt);
      if (!split) {
        await tx.paymentAllocation.createMany({
          data: [
            { paymentId: payment.id, target: 'ARTIST', amount: 0 },
            { paymentId: payment.id, target: 'SHOP', amount },
          ],
        });
      } else {
        const artistAmount = roundHalfUp((amount * split.artistRateBps) / 10000);
        const shopAmount = amount - artistAmount;
        await tx.paymentAllocation.createMany({
          data: [
            { paymentId: payment.id, target: 'ARTIST', amount: artistAmount },
            { paymentId: payment.id, target: 'SHOP', amount: shopAmount },
          ],
        });
      }

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
        ...(isBoss(actor)
          ? {}
          : isArtist(actor)
            ? {
                OR: [
                  { artistId: actor.id },
                  { billType: BILL_TYPE_STORED_VALUE_TOPUP, createdById: actor.id },
                ],
              }
            : { branchId: actor.branchId ?? undefined }),
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
      const variantsSnapshot = it?.selectedVariants ?? it?.variants ?? null;
      const addon = sumAddonMoneyFromVariantsSnapshot(variantsSnapshot);
      const base = Number(it?.basePrice ?? it?.finalPrice ?? 0) + addon;
      const final = Number(it?.finalPrice ?? it?.basePrice ?? 0) + addon;
      return {
        serviceId: it?.serviceId ?? null,
        nameSnapshot: String(it?.serviceName ?? it?.name ?? '服務'),
        basePriceSnapshot: Math.max(0, Math.trunc(base)),
        finalPriceSnapshot: Math.max(0, Math.trunc(final)),
        variantsSnapshot,
        notes: it?.notes ?? null,
        sortOrder: idx,
      };
    });

    const listTotal = mapped.reduce((sum, it) => sum + it.basePriceSnapshot, 0);
    const billTotal = mapped.reduce((sum, it) => sum + it.finalPriceSnapshot, 0);
    const discountTotal = Math.max(0, listTotal - billTotal);
    return { listTotal, billTotal, discountTotal, items: mapped };
  }

  /**
   * 由（可能缺少 items 的）購物車資料推導帳單 totals/items
   * - 若有 items：沿用 cartSnapshot.items（以 finalPrice 為應收）
   * - 若無 items 但有 total：建立單一明細「購物車總額」
   */
  private computeTotalsFromCart(cartSnapshot: any, cartTotalPrice?: number | null) {
    const derivedFromItems = this.computeTotalsFromCartSnapshot(cartSnapshot);
    if (derivedFromItems) return derivedFromItems;

    const total =
      typeof cartSnapshot?.totalPrice === 'number'
        ? cartSnapshot.totalPrice
        : typeof cartTotalPrice === 'number'
          ? cartTotalPrice
          : null;

    if (total === null) return null;

    const t = Math.max(0, Math.trunc(Number(total)));
    if (!Number.isFinite(t) || t <= 0) return null;

    return {
      listTotal: t,
      billTotal: t,
      discountTotal: 0,
      items: [
        {
          serviceId: null,
          nameSnapshot: '購物車總額',
          basePriceSnapshot: t,
          finalPriceSnapshot: t,
          variantsSnapshot: null,
          notes: null,
          sortOrder: 0,
        },
      ],
    };
  }

  /**
   * 取得刺青師的最新拆帳規則（每位刺青師一組，不分分店）
   * @param artistId 刺青師 ID
   * @returns 拆帳比例 { artistRateBps, shopRateBps } 或 null（無規則）
   */
  private async getLatestSplitRuleByArtist(artistId: string) {
    // 只查該刺青師最新一筆規則（不分 branchId）
    const rule = await this.prisma.artistSplitRule.findFirst({
      where: { artistId },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!rule) return null;

    const artistRateBps = clampInt(rule.artistRateBps, 0, 10000);
    const shopRateBps = clampInt(rule.shopRateBps, 0, 10000);
    const sum = artistRateBps + shopRateBps;
    if (sum !== 10000 && sum > 0) {
      const normalizedArtist = roundHalfUp((artistRateBps / sum) * 10000);
      return { artistRateBps: normalizedArtist, shopRateBps: 10000 - normalizedArtist };
    }
    return { artistRateBps, shopRateBps };
  }

  private async resolveSplitRule(actor: AccessActor, artistId: string | null, branchId: string, at: Date) {
    // 無 artistId 或無規則：回傳 null（不再有預設 70/30）
    if (!artistId) return null;
    return this.getLatestSplitRuleByArtist(artistId);
  }

  private async ensureBillInternal(tx: Prisma.TransactionClient, appointmentId: string, createdById?: string) {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: true,
        contact: { select: { id: true, cartSnapshot: true, cartTotalPrice: true } },
      },
    });
    if (!appointment) throw new NotFoundException('預約不存在');

    const effectiveCartSnapshot = appointment.cartSnapshot ?? appointment.contact?.cartSnapshot ?? null;
    const cartDerived = this.computeTotalsFromCart(effectiveCartSnapshot, appointment.contact?.cartTotalPrice ?? null);

    // 若使用到 contact.cartSnapshot 且有 items，順手寫回 appointment.cartSnapshot，讓後續系統一致
    if (!appointment.cartSnapshot && appointment.contact?.cartSnapshot) {
      const hasItems = Array.isArray((appointment.contact.cartSnapshot as any)?.items) && (appointment.contact.cartSnapshot as any).items.length > 0;
      if (hasItems) {
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { cartSnapshot: appointment.contact.cartSnapshot as any },
        });
      }
    }
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
      const hasDifferentCartTotal = cartDerived.billTotal !== existingBill.billTotal;
      shouldAutoRebuild = hasDifferentCartTotal;
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
      // 重新計算帳單狀態：已收不變，依新 billTotal 決定 OPEN/SETTLED（VOID 不動）
      const paidTotal =
        (await tx.payment.aggregate({ where: { billId: bill.id }, _sum: { amount: true } }))._sum.amount || 0;
      const nextStatus: BillStatus = bill.status === 'VOID' ? 'VOID' : paidTotal >= billTotal ? 'SETTLED' : 'OPEN';
      if (nextStatus !== bill.status) {
        await tx.appointmentBill.update({ where: { id: bill.id }, data: { status: nextStatus } });
      }
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
      if (query.artistId && query.artistId !== 'all') where.artistId = query.artistId;
    } else if (isArtist(actor)) {
      // ARTIST: only see bills where artistId = actor.id OR (stored value topup created by actor)
      where.OR = [
        { artistId: actor.id },
        { billType: BILL_TYPE_STORED_VALUE_TOPUP, createdById: actor.id },
      ];
    } else {
      // Other roles: scope by branch
      where.branchId = actor.branchId ?? undefined;
      if (query.artistId && query.artistId !== 'all') where.artistId = query.artistId;
    }
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
            method: true,
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
      const storedValuePaidTotal = b.payments.reduce((s, p) => (p.method === 'STORED_VALUE' ? s + p.amount : s), 0);
      const cashPaidTotal = b.payments.reduce((s, p) => (p.method === 'STORED_VALUE' ? s : s + p.amount), 0);
      const paidTotal = cashPaidTotal + storedValuePaidTotal;
      
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
          cashPaidTotal,
          storedValuePaidTotal,
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

  async exportBillsXlsx(
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
  ): Promise<Buffer> {
    if (!isBoss(actor)) throw new ForbiddenException('只有 BOSS 可以匯出');

    const rows = await this.listBills(actor, query);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'tattoo-crm';
    wb.created = new Date();
    const ws = wb.addWorksheet('帳務清單');

    ws.columns = [
      { header: '帳單建立時間', key: 'createdAt', width: 20 },
      { header: '會員', key: 'customer', width: 22 },
      { header: '刺青師', key: 'artist', width: 14 },
      { header: '分店', key: 'branch', width: 12 },
      { header: '應收', key: 'billTotal', width: 10, style: { numFmt: '#,##0' } },
      { header: '已收', key: 'paidTotal', width: 10, style: { numFmt: '#,##0' } },
      { header: '未收', key: 'dueTotal', width: 10, style: { numFmt: '#,##0' } },
      { header: '店家', key: 'shopAmount', width: 10, style: { numFmt: '#,##0' } },
      { header: '刺青師', key: 'artistAmount', width: 10, style: { numFmt: '#,##0' } },
      { header: '狀態', key: 'status', width: 10 },
      { header: '帳單ID', key: 'id', width: 28 },
    ];

    ws.getRow(1).font = { bold: true };

    const fmtDateTime = (d: any) => {
      try {
        const dt = d instanceof Date ? d : new Date(d);
        if (Number.isNaN(dt.getTime())) return '';
        return dt.toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      } catch {
        return '';
      }
    };

    for (const r of rows as any[]) {
      const customerName = r.customer?.name ?? r.customerNameSnapshot ?? '';
      const customerPhone = r.customer?.phone ?? r.customerPhoneSnapshot ?? '';
      const customer = [customerName, customerPhone].filter(Boolean).join(' ');

      ws.addRow({
        createdAt: fmtDateTime(r.createdAt),
        customer,
        artist: r.artist?.name ?? '',
        branch: r.branch?.name ?? '',
        billTotal: r.billTotal ?? 0,
        paidTotal: r.summary?.paidTotal ?? 0,
        dueTotal: r.summary?.dueTotal ?? 0,
        shopAmount: r.summary?.shopAmount ?? 0,
        artistAmount: r.summary?.artistAmount ?? 0,
        status: r.status ?? '',
        id: r.id,
      });
    }

    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const buf: any = await wb.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
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
    if (!isBoss(actor) && !isArtist(actor)) throw new ForbiddenException('Only BOSS/ARTIST can create manual bills');

    // ARTIST: force scope to own branch & self (ignore any client-provided values)
    const branchId = isArtist(actor) ? actor.branchId ?? null : input.branchId;
    const artistId = isArtist(actor) ? actor.id : input.artistId ?? null;

    if (!branchId) throw new BadRequestException('branchId is required');
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
        branchId,
        customerId: input.customerId ?? null,
        artistId,
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

      // STORED_VALUE 扣款不進拆帳（allocations 固定 0/0）
      if (method === 'STORED_VALUE') {
        await tx.paymentAllocation.createMany({
          data: [
            { paymentId: payment.id, target: 'ARTIST', amount: 0 },
            { paymentId: payment.id, target: 'SHOP', amount: 0 },
          ],
        });
      } else if (!bill.artistId) {
        await tx.paymentAllocation.createMany({
          data: [
            { paymentId: payment.id, target: 'ARTIST', amount: 0 },
            { paymentId: payment.id, target: 'SHOP', amount: 0 },
          ],
        });
      } else {
        const split = await this.resolveSplitRule(actor, bill.artistId, bill.branchId, paidAt);
        if (!split) {
          // 無規則：allocations 為 0/0
          await tx.paymentAllocation.createMany({
            data: [
              { paymentId: payment.id, target: 'ARTIST', amount: 0 },
              { paymentId: payment.id, target: 'SHOP', amount: 0 },
            ],
          });
        } else {
          const artistAmount = roundHalfUp((amount * split.artistRateBps) / 10000);
          const shopAmount = amount - artistAmount;
          await tx.paymentAllocation.createMany({
            data: [
              { paymentId: payment.id, target: 'ARTIST', amount: artistAmount },
              { paymentId: payment.id, target: 'SHOP', amount: shopAmount },
            ],
          });
        }
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

      // STORED_VALUE 扣款不進拆帳（allocations 固定 0/0）
      if (method === 'STORED_VALUE') {
        await tx.paymentAllocation.createMany({
          data: [
            { paymentId: payment.id, target: 'ARTIST', amount: 0 },
            { paymentId: payment.id, target: 'SHOP', amount: 0 },
          ],
        });
      } else {
        // Compute allocations for this payment
        const split = await this.resolveSplitRule(actor, bill.artistId, bill.branchId, paidAt);

        // 無規則：allocations 為 0/0
        if (!split) {
          await tx.paymentAllocation.createMany({
            data: [
              { paymentId: payment.id, target: 'ARTIST', amount: 0 },
              { paymentId: payment.id, target: 'SHOP', amount: 0 },
            ],
          });
        } else {
          // 有規則：hybrid 拆帳邏輯
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
        }
      }

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
    
    const allRules = await this.prisma.artistSplitRule.findMany({
      where,
      orderBy: [{ artistId: 'asc' }, { branchId: 'desc' }, { effectiveFrom: 'desc' }],
      include: { artist: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } },
    });

    // 去重：每個 (artistId, branchId) 只回最新一筆
    const seen = new Map<string, typeof allRules[0]>();
    for (const rule of allRules) {
      const key = `${rule.artistId}:${rule.branchId || 'null'}`;
      if (!seen.has(key)) {
        seen.set(key, rule);
      }
    }

    return Array.from(seen.values()).sort((a, b) => {
      if (a.artistId < b.artistId) return -1;
      if (a.artistId > b.artistId) return 1;
      if (a.branchId && !b.branchId) return -1;
      if (!a.branchId && b.branchId) return 1;
      return 0;
    });
  }

  async upsertSplitRule(
    actor: AccessActor,
    input: { artistId: string; branchId: string | null; artistRateBps: number; effectiveFrom?: Date },
  ) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can manage split rules');
    const artistRateBps = clampInt(Math.trunc(input.artistRateBps), 0, 10000);
    const shopRateBps = 10000 - artistRateBps;
    
    return this.prisma.$transaction(async (tx) => {
      // 查找該 artistId 的所有規則
      const allRules = await tx.artistSplitRule.findMany({
        where: { artistId: input.artistId },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (allRules.length === 0) {
        // 沒有規則，建立新規則（branchId 設為 null，因為現在是 per_artist_only）
        return tx.artistSplitRule.create({
          data: {
            artistId: input.artistId,
            branchId: null,
            artistRateBps,
            shopRateBps,
            effectiveFrom: input.effectiveFrom ?? new Date(),
          },
        });
      }

      // 有規則：保留最新一筆並更新，刪除其他
      const latest = allRules[0];
      const toDelete = allRules.slice(1).map((r) => r.id);

      // 更新最新一筆
      const updated = await tx.artistSplitRule.update({
        where: { id: latest.id },
        data: {
          artistRateBps,
          shopRateBps,
          branchId: null, // 統一設為 null（per_artist_only）
          effectiveFrom: input.effectiveFrom ?? new Date(),
          updatedAt: new Date(),
        },
      });

      // 刪除其他舊規則
      if (toDelete.length > 0) {
        await tx.artistSplitRule.deleteMany({
          where: { id: { in: toDelete } },
        });
        console.log(`🗑️ 刪除 ${toDelete.length} 筆重複規則（artistId=${input.artistId}）`);
      }

      return updated;
    });
  }

  async deleteSplitRule(actor: AccessActor, artistId: string) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can manage split rules');
    
    const deleted = await this.prisma.artistSplitRule.deleteMany({
      where: { artistId },
    });
    
    console.log(`🗑️ 刪除拆帳規則：artistId=${artistId}，共 ${deleted.count} 筆`);
    return { artistId, deletedCount: deleted.count };
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
            select: {
              id: true,
              cartSnapshot: true,
              contact: { select: { id: true, cartSnapshot: true, cartTotalPrice: true } },
              service: { select: { id: true, name: true, price: true } },
            },
          },
          items: true,
        },
      });

      if (!bill) throw new NotFoundException('帳單不存在');
      if (!bill.appointmentId) throw new BadRequestException('此帳單未綁定預約，無法重建');
      if (!bill.appointment) throw new NotFoundException('預約不存在');

      const effectiveCartSnapshot = bill.appointment.cartSnapshot ?? bill.appointment.contact?.cartSnapshot ?? null;
      const cartDerived = this.computeTotalsFromCart(effectiveCartSnapshot, bill.appointment.contact?.cartTotalPrice ?? null);
      if (!cartDerived) {
        throw new BadRequestException('此預約沒有可用的購物車資料（cartSnapshot/items 或 cartTotalPrice），無法重建帳單');
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
    // 1. 有 bill
    // 2. 有購物車資料：appointment.cartSnapshot 或 contact.cartSnapshot/cartTotalPrice
    // 3. 只有「金額不一致」才重建（以購物車總額為準）
    const appointments = await this.prisma.appointment.findMany({
      where: {
        id: input?.appointmentIds ? { in: input.appointmentIds } : undefined,
        bill: { isNot: null },
        OR: [
          { cartSnapshot: { not: null } },
          {
            contact: {
              is: {
                OR: [{ cartSnapshot: { not: null } }, { cartTotalPrice: { not: null } }],
              },
            },
          },
        ],
      },
      select: {
        id: true,
        cartSnapshot: true,
        contact: { select: { id: true, cartSnapshot: true, cartTotalPrice: true } },
        service: { select: { id: true, name: true, price: true } },
        bill: { select: { id: true, billTotal: true, items: true } },
      },
    });

    const rebuiltBills: string[] = [];
    const errors: Array<{ appointmentId: string; error: string }> = [];

    for (const appt of appointments) {
      try {
        if (!appt.bill) continue;

        const effectiveCartSnapshot = appt.cartSnapshot ?? appt.contact?.cartSnapshot ?? null;
        const derived = this.computeTotalsFromCart(effectiveCartSnapshot, appt.contact?.cartTotalPrice ?? null);
        const effectiveTotal = derived?.billTotal ?? null;

        // 只有「應收 != 購物車總額」才重建
        const shouldRebuild = typeof effectiveTotal === 'number' && effectiveTotal > 0 && appt.bill.billTotal !== effectiveTotal;

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
        // 刪除舊的 allocations
        await this.prisma.paymentAllocation.deleteMany({
          where: { paymentId: payment.id },
        });

        // STORED_VALUE 扣款不進拆帳（allocations 固定 0/0）
        if (payment.method === 'STORED_VALUE') {
          await this.prisma.paymentAllocation.createMany({
            data: [
              { paymentId: payment.id, target: 'ARTIST', amount: 0 },
              { paymentId: payment.id, target: 'SHOP', amount: 0 },
            ],
          });
          recomputed.push(payment.id);
          console.log(`✅ 重算拆帳 Payment ${payment.id}：STORED_VALUE → 0/0`);
          continue;
        }

        // 如果沒有 artistId，allocations 為 0/0
        if (!payment.bill.artistId) {
          await this.prisma.paymentAllocation.createMany({
            data: [
              { paymentId: payment.id, target: 'ARTIST', amount: 0 },
              { paymentId: payment.id, target: 'SHOP', amount: 0 },
            ],
          });
          recomputed.push(payment.id);
          console.log(`✅ 重算拆帳 Payment ${payment.id}：無 artistId → 0/0`);
          continue;
        }

        // 取得「目前最新」的拆帳規則（每位刺青師一組）
        const split = await this.getLatestSplitRuleByArtist(payment.bill.artistId);

        // 無規則：allocations 為 0/0
        if (!split) {
          await this.prisma.paymentAllocation.createMany({
            data: [
              { paymentId: payment.id, target: 'ARTIST', amount: 0 },
              { paymentId: payment.id, target: 'SHOP', amount: 0 },
            ],
          });
          recomputed.push(payment.id);
          console.log(`✅ 重算拆帳 Payment ${payment.id}：無規則 → 0/0`);
          continue;
        }

        // 計算新的拆帳金額
        const artistAmount = roundHalfUp((payment.amount * split.artistRateBps) / 10000);
        const shopAmount = payment.amount - artistAmount;

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


