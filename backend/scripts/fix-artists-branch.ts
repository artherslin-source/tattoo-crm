import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 目標新帳號（剛新增的）
  const targets = [
    'chen-xiangnan@tattoo.local',
    'zhu-chuanjin-donggang@tattoo.local',
    'zhu-chuanjin-sanchong@tattoo.local',
  ];

  // 讀出現有分店與刺青師，用於決定應該對齊的 branchId
  const [branches, artists] = await Promise.all([
    prisma.branch.findMany(),
    prisma.artist.findMany({ include: { branch: true, user: true } }),
  ]);

  // 用既有刺青師所使用的分店來決定對齊 ID（避免同名分店造成割裂）
  const branchNameToIdByUsage = new Map<string, string>();
  for (const a of artists) {
    if (a.branch?.name) {
      if (!branchNameToIdByUsage.has(a.branch.name)) {
        branchNameToIdByUsage.set(a.branch.name, a.branchId || '');
      }
    }
  }

  function resolveBranchId(preferredName: string): string | null {
    // 先用已被使用中的分店 ID
    const usedId = branchNameToIdByUsage.get(preferredName);
    if (usedId) return usedId;
    // 否則回退到名稱完全相同的第一筆
    const b = branches.find(b => b.name === preferredName);
    return b?.id ?? null;
  }

  const targetMapping: Array<{ email: string; name: string; branchName: string }> = [
    { email: 'chen-xiangnan@tattoo.local', name: '陳翔男', branchName: '東港店' },
    { email: 'zhu-chuanjin-donggang@tattoo.local', name: '朱川進', branchName: '東港店' },
    { email: 'zhu-chuanjin-sanchong@tattoo.local', name: '朱川進', branchName: '三重店' },
  ];

  for (const t of targetMapping) {
    const user = await prisma.user.findUnique({ where: { email: t.email } });
    if (!user) {
      console.warn(`⚠️ 找不到使用者: ${t.email}`);
      continue;
    }
    const artist = await prisma.artist.findUnique({ where: { userId: user.id } });
    if (!artist) {
      console.warn(`⚠️ 找不到 Artist 記錄: ${t.email}`);
      continue;
    }

    const targetBranchId = resolveBranchId(t.branchName);
    if (!targetBranchId) {
      console.warn(`⚠️ 找不到分店 '${t.branchName}'，略過: ${t.email}`);
      continue;
    }

    if (artist.branchId !== targetBranchId || artist.displayName !== t.name || artist.active === false) {
      await prisma.artist.update({
        where: { id: artist.id },
        data: {
          branchId: targetBranchId,
          displayName: t.name,
          active: true,
        },
      });
      console.log(`✅ 已更新 ${t.email} → 分店='${t.branchName}', branchId=${targetBranchId}`);
    } else {
      console.log(`ℹ️ 無需更新 ${t.email}`);
    }
  }

  // 輸出摘要
  const latest = await prisma.artist.findMany({ include: { user: true, branch: true } });
  console.table(
    latest
      .filter(a => targets.includes(a.user.email))
      .map(a => ({ email: a.user.email, name: a.displayName, branch: a.branch?.name, branchId: a.branchId }))
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });


