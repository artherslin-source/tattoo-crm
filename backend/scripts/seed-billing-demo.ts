import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

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

  const isProdLike = detectProductionDb(databaseUrl);
  const force = hasFlag('--yes') || hasFlag('--force');
  const iUnderstand = hasFlag('--i-understand');

  if (!force) throw new Error('Refusing to run without --yes (or --force)');
  if (isProdLike && !iUnderstand) throw new Error('Refusing to run against production-like DB without --i-understand');

  console.log('🌱 seed-billing-demo: start');
  console.log(`   - production_like: ${isProdLike}`);

  // Ensure at least one admin exists (do NOT modify existing admins)
  let admin = await prisma.user.findFirst({
    where: { role: { in: ['BOSS', 'SUPER_ADMIN', 'BRANCH_MANAGER'] } },
    select: { id: true },
  });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('12345678', 12);
    const created = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        hashedPassword,
        name: 'Super Admin',
        role: 'BOSS',
        phone: '0988666888',
      },
      select: { id: true },
    });
    console.log('✅ created admin (local convenience)');
    admin = created;
  }

  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  if (branches.length === 0) throw new Error('No branches found. Please create branches first.');

  const services = await prisma.service.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  if (services.length === 0) throw new Error('No services found. Please create services first.');

  const artists = await prisma.user.findMany({
    where: { role: 'ARTIST', isActive: true },
    select: { id: true, name: true },
    take: 10,
  });
  if (artists.length === 0) throw new Error('No ARTIST users found. Please create artists first.');

  // Create members (demo)
  const hashedPassword = await bcrypt.hash('12345678', 12);
  const memberNames = ['張小明', '李美華', '王大偉', '陳雅婷', '林志強', '黃建華', '張淑芬', '李俊豪'];
  const members: Array<{ userId: string; branchId: string; name: string; phone: string }> = [];
  for (let i = 0; i < memberNames.length; i++) {
    const branch = branches[i % branches.length];
    const phone = faker.helpers.replaceSymbolWithNumber('09########');
    const user = await prisma.user.create({
      data: {
        email: `member${Date.now()}_${i}@demo.local`,
        hashedPassword,
        name: memberNames[i],
        role: 'MEMBER',
        phone,
        branchId: branch.id,
        primaryArtistId: artists[i % artists.length].id,
      },
      select: { id: true, name: true, phone: true },
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

  const now = new Date();

  // Appointment bills
  for (let i = 0; i < 10; i++) {
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

    const startAt = faker.date.between({ from: new Date(now.getTime() - 14 * 86400_000), to: new Date(now.getTime() + 14 * 86400_000) });
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
        status: faker.helpers.arrayElement(['CONFIRMED', 'COMPLETED']) as any,
        notes: faker.lorem.sentence(),
        holdMin: 150,
      },
      select: { id: true },
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
      select: { id: true },
    });

    const payAmount = i % 3 === 0 ? Math.round(billTotal * 0.3) : billTotal;
    const payment = await prisma.payment.create({
      data: {
        billId: bill.id,
        amount: payAmount,
        method: faker.helpers.arrayElement(['CASH', 'CARD', 'TRANSFER']),
        paidAt: new Date(),
        recordedById: admin.id,
        notes: null,
      },
      select: { id: true },
    });

    const artistAmount = Math.round(payAmount * 0.7);
    await prisma.paymentAllocation.createMany({
      data: [
        { paymentId: payment.id, target: 'ARTIST', amount: artistAmount },
        { paymentId: payment.id, target: 'SHOP', amount: payAmount - artistAmount },
      ],
    });
  }

  // Walk-in bills
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
      select: { id: true },
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
      select: { id: true },
    });

    const artistAmount = Math.round(amount * 0.7);
    await prisma.paymentAllocation.createMany({
      data: [
        { paymentId: payment.id, target: 'ARTIST', amount: artistAmount },
        { paymentId: payment.id, target: 'SHOP', amount: amount - artistAmount },
      ],
    });
  }

  console.log('✅ seed-billing-demo: done');
}

main()
  .catch((e) => {
    console.error('❌ seed-billing-demo failed:', e?.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


