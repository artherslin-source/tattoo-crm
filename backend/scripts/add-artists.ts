import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureBranchByName(name: string) {
  const branch = await prisma.branch.findFirst({ where: { name } });
  if (!branch) {
    throw new Error(`Branch not found: ${name}`);
  }
  return branch;
}

async function hasUserPersonIdColumn(): Promise<boolean> {
  // 暫時返回 false，因為資料庫中沒有 personId 欄位
  return false;
}

async function ensureArtist(params: {
  name: string;
  email: string;
  branchId: string;
  speciality?: string;
  photoUrl?: string;
  personId?: string;
}) {
  const { name, email, branchId, speciality, photoUrl, personId } = params;
  const canUsePersonId = await hasUserPersonIdColumn();

  // If user exists, reuse; otherwise create
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const data: any = {
      email,
      name,
      role: 'ARTIST',
      branchId,
      isActive: true,
      hashedPassword: 'temp_password_12345678',
    };
    // 暫時跳過 personId 欄位
    // if (canUsePersonId && personId) data.personId = personId;
    user = await prisma.user.create({ data });
  }

  // If artist exists for this user, update branch/speciality/photo; else create
  let artist = await prisma.artist.findUnique({ where: { userId: user.id } });
  if (artist) {
    artist = await prisma.artist.update({
      where: { id: artist.id },
      data: {
        displayName: name,
        branchId,
        speciality,
        photoUrl,
        active: true,
      },
    });
  } else {
    artist = await prisma.artist.create({
      data: {
        userId: user.id,
        displayName: name,
        branchId,
        speciality,
        photoUrl,
        active: true,
      },
    });
  }

  return { user, artist };
}

async function main() {
  const donggang = await ensureBranchByName('東港店');
  const sanchong = await ensureBranchByName('三重店');

  // 1) 陳翔男（東港店）
  await ensureArtist({
    name: '陳翔男',
    email: 'chen-xiangnan@tattoo.local',
    branchId: donggang.id,
    speciality: '日式與傳統風格',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
  });

  // 2) 朱川進（東港店、三重店）→ 以兩個分店建立兩個 Artist/User 帳號，分開統計與排程
  // 暫時跳過 personId 功能
  await ensureArtist({
    name: '朱川進',
    email: 'zhu-chuanjin-donggang@tattoo.local',
    branchId: donggang.id,
    speciality: '寫實與線條',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  });

  await ensureArtist({
    name: '朱川進',
    email: 'zhu-chuanjin-sanchong@tattoo.local',
    branchId: sanchong.id,
    speciality: '寫實與線條',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  });

  // 驗證結果
  const totalArtists = await prisma.artist.count();
  console.log(`✅ 已建立/更新：陳翔男（東港店）、朱川進（東港店、三重店）`);
  console.log(`📊 目前總刺青師數量：${totalArtists}`);
  
  const newArtists = await prisma.artist.findMany({
    where: {
      OR: [
        { user: { email: 'chen-xiangnan@tattoo.local' } },
        { user: { email: 'zhu-chuanjin-donggang@tattoo.local' } },
        { user: { email: 'zhu-chuanjin-sanchong@tattoo.local' } }
      ]
    },
    include: {
      user: { select: { name: true, email: true } },
      branch: { select: { name: true } }
    }
  });
  
  console.log('📋 新增的刺青師：');
  newArtists.forEach(a => {
    console.log(`  - ${a.displayName} (${a.branch.name})`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


