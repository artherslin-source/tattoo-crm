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

  if (!yes) throw new Error('Refusing to run without --yes (or --force)');
  if (isProdLike && !iUnderstand) {
    throw new Error('Refusing to run against production-like DB without --i-understand');
  }

  console.log('🛑 disable-branch-managers: start');
  console.log(`   - production_like: ${isProdLike}`);

  const result = await prisma.user.updateMany({
    where: { role: 'BRANCH_MANAGER' },
    data: {
      isActive: false,
      status: 'DISABLED',
    },
  });

  console.log('✅ disable-branch-managers: done', { disabled: result.count });
}

main()
  .catch((e) => {
    console.error('❌ disable-branch-managers failed:', e?.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


