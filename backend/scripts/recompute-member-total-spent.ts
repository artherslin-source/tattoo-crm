import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function detectProductionDb(databaseUrl: string | undefined): boolean {
  if (!databaseUrl) return false;
  const u = databaseUrl.toLowerCase();
  return u.includes('railway') || u.includes('rlwy.net') || u.includes('proxy.rlwy.net');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  const isProdLike = detectProductionDb(databaseUrl) || hasFlag('--production-like');
  const yes = hasFlag('--yes') || hasFlag('--force');
  const iUnderstand = hasFlag('--i-understand');

  if (!yes) {
    throw new Error('Refusing to run without --yes (or --force)');
  }
  if (isProdLike && !iUnderstand) {
    throw new Error('Refusing to run against production-like DB without --i-understand');
  }

  console.log('🧮 recompute-member-total-spent: start');
  console.log(`   - production_like: ${isProdLike}`);

  const members = await prisma.member.findMany({
    select: { id: true, userId: true, totalSpent: true },
  });

  let updated = 0;
  for (const m of members) {
    const sum = await prisma.payment.aggregate({
      where: {
        bill: {
          customerId: m.userId,
          // Avoid voided bills affecting totalSpent
          status: { not: 'VOID' },
        },
      },
      _sum: { amount: true },
    });
    const next = sum._sum.amount ?? 0;

    if (m.totalSpent !== next) {
      await prisma.member.update({
        where: { id: m.id },
        data: { totalSpent: next },
      });
      updated++;
    }
  }

  console.log('✅ recompute-member-total-spent: done', {
    members: members.length,
    updated,
  });
}

main()
  .catch((e) => {
    console.error('❌ recompute-member-total-spent failed:', e?.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


