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
  try {
    const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE lower(table_name) = 'user' AND column_name = 'personid') as exists"
    );
    return !!rows?.[0]?.exists;
  } catch {
    return false;
  }
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
    const data: Record<string, unknown> = {
      email,
      name,
      role: 'ARTIST',
      branchId,
      isActive: true,
      hashedPassword: 'temp_password_12345678',
    };
    if (canUsePersonId && personId) data.personId = personId;
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
  const placeholder = 'https://placehold.co/600x800?text=Artist';

  const donggang = await ensureBranchByName('東港店');
  const sanchong = await ensureBranchByName('三重店');

  // 1) 陳翔男（東港店）
  await ensureArtist({
    name: '陳翔男',
    email: 'chen-xiangnan@tattoo.local',
    branchId: donggang.id,
    speciality: '日式與傳統風格',
    photoUrl: placeholder,
  });

  // 2) 朱川進（東港店、三重店）→ 以兩個分店建立兩個 Artist/User 帳號，分開統計與排程
  const zhuPersonId = 'person-zhu-chuanjin';
  await ensureArtist({
    name: '朱川進',
    email: 'zhu-chuanjin-donggang@tattoo.local',
    branchId: donggang.id,
    speciality: '寫實與線條',
    photoUrl: placeholder,
    personId: zhuPersonId,
  });

  await ensureArtist({
    name: '朱川進',
    email: 'zhu-chuanjin-sanchong@tattoo.local',
    branchId: sanchong.id,
    speciality: '寫實與線條',
    photoUrl: placeholder,
    personId: zhuPersonId,
  });

  console.log('✅ 已建立/更新：陳翔男（東港店）、朱川進（東港店、三重店）');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


