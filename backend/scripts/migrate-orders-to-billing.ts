import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function roundHalfUp(n: number) {
  return Math.round(n);
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeTotalsFromCartSnapshot(cartSnapshot: any) {
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
  const listTotal = mapped.reduce((s, it) => s + it.basePriceSnapshot, 0);
  const billTotal = mapped.reduce((s, it) => s + it.finalPriceSnapshot, 0);
  const discountTotal = Math.max(0, listTotal - billTotal);
  return { listTotal, billTotal, discountTotal, items: mapped };
}

async function resolveSplitRule(artistId: string | null, branchId: string, at: Date) {
  const fallback = { artistRateBps: 7000, shopRateBps: 3000 };
  if (!artistId) return fallback;
  const rule = await prisma.artistSplitRule.findFirst({
    where: {
      artistId,
      effectiveFrom: { lte: at },
      OR: [{ branchId }, { branchId: null }],
    },
    orderBy: [{ branchId: 'desc' }, { effectiveFrom: 'desc' }],
  });
  if (!rule) return fallback;
  const artistRateBps = clampInt(rule.artistRateBps, 0, 10000);
  const shopRateBps = clampInt(rule.shopRateBps, 0, 10000);
  const sum = artistRateBps + shopRateBps;
  if (sum !== 10000 && sum > 0) {
    const normalizedArtist = roundHalfUp((artistRateBps / sum) * 10000);
    return { artistRateBps: normalizedArtist, shopRateBps: 10000 - normalizedArtist };
  }
  return { artistRateBps, shopRateBps };
}

async function allocatePaymentsForBill(billId: string) {
  const bill = await prisma.appointmentBill.findUnique({ where: { id: billId } });
  if (!bill) return;

  const payments = await prisma.payment.findMany({
    where: { billId },
    orderBy: { paidAt: 'asc' },
    include: { allocations: true },
  });

  // Remove existing allocations and re-generate for deterministic results.
  await prisma.paymentAllocation.deleteMany({ where: { payment: { billId } } });

  let allocatedArtist = 0;
  let allocatedShop = 0;

  for (const p of payments) {
    const split = await resolveSplitRule(bill.artistId ?? null, bill.branchId, p.paidAt);
    const targetArtistTotal = roundHalfUp((bill.billTotal * split.artistRateBps) / 10000);
    const targetShopTotal = bill.billTotal - targetArtistTotal;

    const amount = p.amount;
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
        if (shopAmount > remainingShop) {
          shopAmount = Math.max(0, remainingShop);
          artistAmount = amount - shopAmount;
        }
        if (artistAmount > remainingArtist) {
          artistAmount = Math.max(0, remainingArtist);
          shopAmount = amount - artistAmount;
        }
      } else {
        artistAmount = roundHalfUp((amount * split.artistRateBps) / 10000);
        shopAmount = amount - artistAmount;
      }
    } else {
      artistAmount = roundHalfUp((amount * split.artistRateBps) / 10000);
      shopAmount = amount - artistAmount;
    }

    await prisma.paymentAllocation.createMany({
      data: [
        { paymentId: p.id, target: 'ARTIST', amount: artistAmount },
        { paymentId: p.id, target: 'SHOP', amount: shopAmount },
      ],
    });

    allocatedArtist += artistAmount;
    allocatedShop += shopAmount;
  }

  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  const status = bill.status === 'VOID' ? 'VOID' : paidTotal >= bill.billTotal ? 'SETTLED' : 'OPEN';
  await prisma.appointmentBill.update({ where: { id: billId }, data: { status } });
}

async function main() {
  console.log('🔄 migrate-orders-to-billing: start');

  const orders = await prisma.order.findMany({
    where: { appointmentId: { not: null } },
    include: { installments: true, appointment: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📦 found ${orders.length} orders with appointmentId`);

  let migratedBills = 0;
  let migratedPayments = 0;

  for (const order of orders) {
    const appointmentId = order.appointmentId!;
    const appointment = order.appointment ?? (await prisma.appointment.findUnique({ where: { id: appointmentId } }));
    if (!appointment) continue;

    const existingBill = await prisma.appointmentBill.findUnique({ where: { appointmentId } });

    const cartDerived = computeTotalsFromCartSnapshot(appointment.cartSnapshot);
    const listTotal = cartDerived?.listTotal ?? order.totalAmount;
    const billTotal = cartDerived?.billTotal ?? order.finalAmount;
    const discountTotal = cartDerived?.discountTotal ?? Math.max(0, order.totalAmount - order.finalAmount);

    const bill =
      existingBill ??
      (await prisma.appointmentBill.create({
        data: {
          appointmentId,
          branchId: appointment.branchId,
          customerId: appointment.userId,
          artistId: appointment.artistId ?? null,
          currency: 'TWD',
          listTotal,
          discountTotal,
          billTotal,
          status: 'OPEN',
          items: cartDerived
            ? {
                create: cartDerived.items.map((it) => ({
                  serviceId: it.serviceId,
                  nameSnapshot: it.nameSnapshot,
                  basePriceSnapshot: it.basePriceSnapshot,
                  finalPriceSnapshot: it.finalPriceSnapshot,
                  variantsSnapshot: it.variantsSnapshot,
                  notes: it.notes,
                  sortOrder: it.sortOrder,
                })),
              }
            : undefined,
        },
      }));

    if (!existingBill) migratedBills += 1;

    // ONE_TIME payment (if paid)
    if (order.paymentType === 'ONE_TIME') {
      const isPaid = ['PAID', 'PAID_COMPLETE', 'COMPLETED', 'INSTALLMENT_ACTIVE', 'PARTIALLY_PAID'].includes(order.status);
      if (isPaid && order.paidAt) {
        const note = `legacyOrderId=${order.id}`;
        const exists = await prisma.payment.findFirst({ where: { billId: bill.id, notes: note } });
        if (!exists) {
          await prisma.payment.create({
            data: {
              billId: bill.id,
              amount: order.finalAmount,
              method: (order.paymentMethod || 'UNKNOWN').toUpperCase(),
              paidAt: order.paidAt,
              recordedById: null,
              notes: note,
            },
          });
          migratedPayments += 1;
        }
      }
    }

    // INSTALLMENT payments
    if (order.paymentType === 'INSTALLMENT') {
      for (const inst of order.installments) {
        if (inst.status !== 'PAID' || !inst.paidAt) continue;
        const note = `legacyInstallmentId=${inst.id}`;
        const exists = await prisma.payment.findFirst({ where: { billId: bill.id, notes: note } });
        if (!exists) {
          await prisma.payment.create({
            data: {
              billId: bill.id,
              amount: inst.amount,
              method: (inst.paymentMethod || 'UNKNOWN').toUpperCase(),
              paidAt: inst.paidAt,
              recordedById: null,
              notes: note,
            },
          });
          migratedPayments += 1;
        }
      }
    }

    // Recompute allocations + status deterministically
    await allocatePaymentsForBill(bill.id);
  }

  console.log('✅ migrate-orders-to-billing: done', { migratedBills, migratedPayments });
}

main()
  .catch((e) => {
    console.error('❌ migrate-orders-to-billing failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


