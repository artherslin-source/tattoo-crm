import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function isTruthy(v: unknown): boolean {
  return v === true || v === 'true' || v === '1' || v === 1;
}

async function main() {
  console.log('🌱 Prisma seed (Billing-only)');

  // PROTECT_REAL_DATA=true: keep Branch/Service/Artist/Admin; only reset Contact/Appointment/Billing + MEMBER demo data
  const PROTECT_REAL_DATA = isTruthy(process.env.PROTECT_REAL_DATA);
  console.log(PROTECT_REAL_DATA ? '🛡️ 保護模式：保留分店/刺青師/服務/管理員' : 'ℹ️ 預設行為：仍保留分店/刺青師/服務/管理員');

  // 1) Domain-only cleanup (contacts/appointments/billing + demo members)
  console.log('🧹 清理 domain data (Contact/Appointment/Billing/Members)...');
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointmentBillItem.deleteMany();
  await prisma.appointmentBill.deleteMany();
  await prisma.completedService.deleteMany();
    await prisma.appointment.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.topupHistory.deleteMany();
    await prisma.member.deleteMany();
  await prisma.user.deleteMany({ where: { role: 'MEMBER' } });

  // 2) Ensure at least one admin exists (for local dev convenience)
  const hashedPassword = await bcrypt.hash('12345678', 12);
  const existingAdmin = await prisma.user.findFirst({ where: { role: { in: ['BOSS', 'SUPER_ADMIN', 'BRANCH_MANAGER'] } } });
  if (!existingAdmin && !PROTECT_REAL_DATA) {
    await prisma.user.create({
    data: {
      email: 'admin@test.com',
      hashedPassword,
      name: 'Super Admin',
      role: 'BOSS',
        phone: '0988666888',
      },
    });
    console.log('✅ 建立管理員帳號：admin@test.com / 0988666888 / 12345678');
  }

  // 3) Load required references
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  if (branches.length === 0) {
    throw new Error('No branches found. Please create branches first (or run a bootstrap script).');
  }

  const services = await prisma.service.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  if (services.length === 0) {
    throw new Error('No services found. Please create services first.');
  }

  const artists = await prisma.user.findMany({
    where: { role: 'ARTIST', isActive: true },
    select: { id: true, name: true, branchId: true },
    take: 10,
  });
  if (artists.length === 0) {
    throw new Error('No ARTIST users found. Please create artists first.');
  }

  const admin = await prisma.user.findFirst({
    where: { role: { in: ['BOSS', 'SUPER_ADMIN', 'BRANCH_MANAGER'] } },
    select: { id: true },
  });
  if (!admin) throw new Error('No admin user found (create one or disable PROTECT_REAL_DATA).');

  // 4) Create members + member accounts
  console.log('👥 建立會員...');
  const memberNames = ['張小明', '李美華', '王大偉', '陳雅婷', '林志強', '黃建華', '張淑芬', '李俊豪'];
  const members: Array<{ userId: string; branchId: string; name: string; phone: string }> = [];
  for (let i = 0; i < memberNames.length; i++) {
    const branch = branches[i % branches.length];
    const primaryArtist = artists[i % artists.length];
    const phone = faker.helpers.replaceSymbolWithNumber('09########');
    const user = await prisma.user.create({
      data: {
        email: `member${i + 1}@demo.local`,
        hashedPassword,
        name: memberNames[i],
        role: 'MEMBER',
        phone,
        branchId: branch.id,
        primaryArtistId: primaryArtist.id,
      },
    });
    await prisma.member.create({
      data: {
        userId: user.id,
        totalSpent: faker.number.int({ min: 0, max: 80000 }),
        balance: faker.number.int({ min: 0, max: 20000 }),
        membershipLevel: faker.helpers.arrayElement(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']),
      },
    });
    members.push({ userId: user.id, branchId: branch.id, name: user.name ?? '客戶', phone: user.phone ?? phone });
  }

  // 5) Create contacts + appointments + bills + payments
  console.log('📅 建立預約與帳務...');
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const m = members[i % members.length];
    const branch = branches[i % branches.length];
    const service = services[i % services.length];
    const artist = artists[i % artists.length];

    const contact = await prisma.contact.create({
      data: {
        name: m.name,
        phone: m.phone,
        email: null,
        message: faker.lorem.sentence(),
        branchId: branch.id,
      } as any,
    });

    const startAt = faker.date.between({
      from: new Date(now.getTime() - 30 * 86400_000),
      to: new Date(now.getTime() + 30 * 86400_000),
    });
    const endAt = new Date(startAt.getTime() + (service.durationMin || 120) * 60_000);

    const appointment = await prisma.appointment.create({
        data: {
        branchId: branch.id,
        userId: m.userId,
        artistId: artist.id,
        serviceId: service.id,
        contactId: contact.id,
        startAt,
        endAt,
        status: faker.helpers.arrayElement(['CONFIRMED', 'COMPLETED', 'PENDING']) as any,
        notes: faker.lorem.sentence(),
        holdMin: 150,
        },
      });

    const billTotal = service.price;
    const bill = await prisma.appointmentBill.create({
        data: {
        appointmentId: appointment.id,
        branchId: branch.id,
        customerId: m.userId,
        artistId: artist.id,
        currency: 'TWD',
        billType: 'APPOINTMENT',
        createdById: admin.id,
        listTotal: billTotal,
        discountTotal: 0,
        billTotal,
        status: 'OPEN',
        items: {
          create: [
            {
              serviceId: service.id,
              nameSnapshot: service.name,
              basePriceSnapshot: service.price,
              finalPriceSnapshot: service.price,
              variantsSnapshot: null,
              notes: null,
              sortOrder: 0,
            },
          ],
        },
        },
      });

    const payAmount = i % 3 === 0 ? Math.round(billTotal * 0.3) : billTotal;
    const payment = await prisma.payment.create({
        data: {
        billId: bill.id,
        amount: payAmount,
        method: faker.helpers.arrayElement(['CASH', 'CARD', 'TRANSFER']),
        paidAt: faker.date.between({ from: startAt, to: new Date(startAt.getTime() + 10 * 86400_000) }),
        recordedById: admin.id,
        notes: null,
        },
      });
    const artistAmount = Math.round(payAmount * 0.7);
    const shopAmount = payAmount - artistAmount;
    await prisma.paymentAllocation.createMany({
      data: [
        { paymentId: payment.id, target: 'ARTIST', amount: artistAmount },
        { paymentId: payment.id, target: 'SHOP', amount: shopAmount },
      ],
    });
  }

  // 6) Create a few walk-in bills
  console.log('💰 建立非預約帳單...');
  for (let i = 0; i < 3; i++) {
    const branch = branches[i % branches.length];
    const artist = artists[i % artists.length];
    const amount = faker.number.int({ min: 3000, max: 30000 });

    const bill = await prisma.appointmentBill.create({
        data: { 
        appointmentId: null,
        branchId: branch.id,
        customerId: null,
        customerNameSnapshot: faker.person.fullName(),
        customerPhoneSnapshot: faker.helpers.replaceSymbolWithNumber('09########'),
        artistId: artist.id,
        currency: 'TWD',
        billType: 'WALK_IN',
        createdById: admin.id,
        listTotal: amount,
        discountTotal: 0,
        billTotal: amount,
        status: 'OPEN',
        items: {
          create: [
            {
              serviceId: null,
              nameSnapshot: '現場服務',
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
      
    const payment = await prisma.payment.create({
          data: {
        billId: bill.id,
            amount,
        method: 'CASH',
        paidAt: new Date(),
        recordedById: admin.id,
        notes: null,
          },
        });
    const artistAmount = Math.round(amount * 0.7);
    await prisma.paymentAllocation.createMany({
      data: [
        { paymentId: payment.id, target: 'ARTIST', amount: artistAmount },
        { paymentId: payment.id, target: 'SHOP', amount: amount - artistAmount },
      ],
    });
  }

  console.log('✅ Seed 完成');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


