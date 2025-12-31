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

function roleLabel(role: string | null | undefined) {
  switch (role) {
    case 'BOSS':
      return 'BOSS（全系統）';
    case 'SUPER_ADMIN':
      return 'SUPER_ADMIN（全系統/技術）';
    case 'BRANCH_MANAGER':
      return 'BRANCH_MANAGER（分店管理）';
    case 'ARTIST':
      return 'ARTIST（分店/客戶限定）';
    case 'MEMBER':
      return 'MEMBER（一般會員）';
    default:
      return `UNKNOWN(${role ?? 'null'})`;
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  const isProdLike = detectProductionDb(databaseUrl) || hasFlag('--production-like');
  const yes = hasFlag('--yes') || hasFlag('--force');
  const iUnderstand = hasFlag('--i-understand');
  const listNonMembers = hasFlag('--non-members') || true;

  if (!yes) throw new Error('Refusing to run without --yes (or --force)');
  if (isProdLike && !iUnderstand) {
    throw new Error('Refusing to run against production-like DB without --i-understand');
  }

  const users = await prisma.user.findMany({
    where: {
      ...(listNonMembers
        ? {
            OR: [{ role: null }, { role: { not: 'MEMBER' } }],
          }
        : {}),
      // Exclude soft-deleted/disabled if schema uses status
      status: { not: 'DELETED' },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      branch: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });

  console.log('✅ 管理員帳號清單（不含密碼）');
  console.log(`   - filter: ${listNonMembers ? 'role != MEMBER (含 role=null)' : '(none)'}`);
  console.log(`   - count: ${users.length}`);
  console.log('');

  const rows = users.map((u) => ({
    name: u.name ?? '(未命名)',
    phone: u.phone ?? '(未設定)',
    role: roleLabel(u.role),
    branch: u.branch?.name ?? '(未分店)',
    status: u.status,
  }));

  console.table(rows);
}

main()
  .catch((e) => {
    console.error('❌ list-admin-accounts failed:', e?.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


