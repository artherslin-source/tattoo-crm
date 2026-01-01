/**
 * Backfill legacy stored-value topups (TopupHistory.type=TOPUP) into Billing bills.
 *
 * Goal:
 * - For each legacy TopupHistory TOPUP that does NOT already have a Billing bill/payment,
 *   create an AppointmentBill with billType=STORED_VALUE_TOPUP and a matching Payment.
 *
 * Notes:
 * - We cannot reliably infer the real payment method (cash/card/transfer) for legacy records,
 *   so we record method=OTHER and embed the topupHistoryId for traceability + idempotency.
 * - This script is safe to re-run: it checks for an existing Payment.notes marker.
 */

import { PrismaClient } from '@prisma/client';
import { BILL_TYPE_STORED_VALUE_TOPUP } from '../src/billing/billing.constants';

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const yes = argv.includes('--yes');
  const limitIdx = argv.findIndex((a) => a === '--limit');
  const limit = limitIdx >= 0 ? Number(argv[limitIdx + 1]) : undefined;
  return { yes, limit: Number.isFinite(limit) ? Math.trunc(limit as number) : undefined };
}

async function main() {
  const { yes, limit } = parseArgs(process.argv.slice(2));
  if (!yes) {
    // eslint-disable-next-line no-console
    console.error('Refusing to run without --yes');
    process.exit(2);
  }

  const histories = await prisma.topupHistory.findMany({
    where: { type: 'TOPUP' },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: { member: { include: { user: true } } },
  });

  let created = 0;
  let skipped = 0;

  for (const h of histories) {
    const marker = `topupHistoryId=${h.id}`;

    const exists = await prisma.payment.findFirst({
      where: {
        notes: { contains: marker },
      },
      select: { id: true },
    });

    if (exists) {
      skipped += 1;
      continue;
    }

    const user = h.member.user;
    const branchId = user.branchId;
    if (!branchId) {
      // eslint-disable-next-line no-console
      console.warn(`Skip (no branchId): topupHistory=${h.id} user=${user.id}`);
      skipped += 1;
      continue;
    }

    const amount = Math.trunc(h.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      // eslint-disable-next-line no-console
      console.warn(`Skip (invalid amount): topupHistory=${h.id} amount=${h.amount}`);
      skipped += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
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
          createdById: h.operatorId,
          createdAt: h.createdAt,
          items: {
            create: [
              {
                serviceId: null,
                nameSnapshot: '儲值入金（補帳）',
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
          paidAt: h.createdAt,
          recordedById: h.operatorId,
          notes: `補帳儲值入金 (${marker})`,
        },
      });

      await tx.paymentAllocation.createMany({
        data: [
          { paymentId: payment.id, target: 'ARTIST', amount: 0 },
          { paymentId: payment.id, target: 'SHOP', amount },
        ],
      });
    });

    created += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Done. created=${created} skipped=${skipped} total=${histories.length}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


