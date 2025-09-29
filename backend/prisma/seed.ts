import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始執行 Prisma seeding...');

  // 清理現有資料（按外鍵約束順序）
  try {
    await prisma.installment.deleteMany();
  } catch (e) {
    console.log('⚠️ Installment 表不存在，跳過清理');
  }
  
  try {
    await prisma.order.deleteMany();
  } catch (e) {
    console.log('⚠️ Order 表不存在，跳過清理');
  }
  
  try {
    await prisma.appointment.deleteMany();
  } catch (e) {
    console.log('⚠️ Appointment 表不存在，跳過清理');
  }
  
  try {
    await prisma.artist.deleteMany();
  } catch (e) {
    console.log('⚠️ Artist 表不存在，跳過清理');
  }
  
  try {
    await prisma.member.deleteMany();
  } catch (e) {
    console.log('⚠️ Member 表不存在，跳過清理');
  }
  
  try {
    await prisma.serviceHistory.deleteMany();
  } catch (e) {
    console.log('⚠️ ServiceHistory 表不存在，跳過清理');
  }
  
  try {
    await prisma.service.deleteMany();
  } catch (e) {
    console.log('⚠️ Service 表不存在，跳過清理');
  }
  
  try {
    await prisma.branch.deleteMany();
  } catch (e) {
    console.log('⚠️ Branch 表不存在，跳過清理');
  }
  
  try {
    await prisma.user.deleteMany();
  } catch (e) {
    console.log('⚠️ User 表不存在，跳過清理');
  }

  console.log('✅ 清理現有資料完成');

  // 1. 建立管理員帳號
  const hashedPassword = await bcrypt.hash('12345678', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      hashedPassword,
      name: 'Super Admin',
      role: 'BOSS',
      phone: faker.phone.number(),
      createdAt: faker.date.past(),
    },
  });
  console.log('✅ 建立管理員帳號:', admin.email);

  // 2. 建立 3 個分店
  const branches: any[] = [];
  for (let i = 0; i < 3; i++) {
    const branch = await prisma.branch.create({
      data: {
        name: faker.company.name() + ' 分店',
        address: faker.location.streetAddress(),
        phone: faker.phone.number(),
        businessHours: {
          monday: '09:00-18:00',
          tuesday: '09:00-18:00',
          wednesday: '09:00-18:00',
          thursday: '09:00-18:00',
          friday: '09:00-18:00',
          saturday: '10:00-16:00',
          sunday: 'closed',
        },
        createdAt: faker.date.past(),
      },
    });
    branches.push(branch);
  }
  console.log('✅ 建立 3 個分店');

  // 3. 建立 3 個分店經理
  const managers: any[] = [];
  for (let i = 0; i < 3; i++) {
    const manager = await prisma.user.create({
      data: {
        email: `manager${i + 1}@test.com`,
        hashedPassword,
        name: `分店經理 ${i + 1}`,
        role: 'BRANCH_MANAGER',
        phone: faker.phone.number(),
        branchId: branches[i].id,
        createdAt: faker.date.past(),
      },
    });
    managers.push(manager);
  }
  console.log('✅ 建立 3 個分店經理');

  // 4. 建立 5 個會員（分配到不同分店，包含財務資料）
  const members: any[] = [];
  const memberData = [
    { name: "Member One", totalSpent: 5000, balance: 1000, membershipLevel: "Gold" },
    { name: "Member Two", totalSpent: 12000, balance: 2500, membershipLevel: "Platinum" },
    { name: "Member Three", totalSpent: 8000, balance: 500, membershipLevel: "Silver" },
    { name: "Member Four", totalSpent: 15000, balance: 3000, membershipLevel: "Platinum" },
    { name: "Member Five", totalSpent: 3000, balance: 800, membershipLevel: "Bronze" },
  ];
  
  for (let i = 0; i < 5; i++) {
    const user = await prisma.user.create({
      data: {
        email: `member${i + 1}@test.com`,
        hashedPassword,
        name: memberData[i].name,
        role: 'MEMBER',
        phone: faker.phone.number(),
        birthday: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
        gender: faker.helpers.arrayElement(['MALE', 'FEMALE', 'OTHER']),
        branchId: branches[i % 3].id, // 輪流分配到3個分店
        createdAt: faker.date.past(),
      },
    });

    // 建立對應的 Member 記錄
    const member = await prisma.member.create({
      data: {
        userId: user.id,
        totalSpent: memberData[i].totalSpent,
        balance: memberData[i].balance,
        membershipLevel: memberData[i].membershipLevel,
      },
    });

    members.push({ ...user, member });
  }
  console.log('✅ 建立 5 個會員帳號（包含財務資料）');

  // 5. 建立 3 個刺青師
  const artists: any[] = [];
  const artistData = [
    { name: "Artist One", bio: "專精日式刺青，擁有10年經驗", speciality: "日式傳統刺青", portfolioUrl: "https://portfolio.example.com/artist1" },
    { name: "Artist Two", bio: "專精幾何圖騰，現代風格專家", speciality: "幾何圖騰設計", portfolioUrl: "https://portfolio.example.com/artist2" },
    { name: "Artist Three", bio: "專精黑灰寫實，細節完美主義者", speciality: "黑灰寫實風格", portfolioUrl: "https://portfolio.example.com/artist3" },
  ];
  
  for (let i = 0; i < 3; i++) {
    const artistUser = await prisma.user.create({
      data: {
        email: `artist${i + 1}@test.com`,
        hashedPassword,
        name: artistData[i].name,
        role: 'ARTIST',
        phone: faker.phone.number(),
        branchId: branches[i].id,
        createdAt: faker.date.past(),
      },
    });

    const artist = await prisma.artist.create({
      data: {
        userId: artistUser.id,
        displayName: artistData[i].name,
        bio: artistData[i].bio,
        speciality: artistData[i].speciality,
        portfolioUrl: artistData[i].portfolioUrl,
        styles: [
          faker.helpers.arrayElement(['Traditional', 'Realistic', 'Japanese', 'Blackwork', 'Watercolor']),
          faker.helpers.arrayElement(['Geometric', 'Minimalist', 'Portrait', 'Nature', 'Abstract']),
        ],
        branchId: branches[i].id,
        active: true,
        createdAt: faker.date.past(),
      },
    });
    artists.push({ ...artist, user: artistUser });
  }
  console.log('✅ 建立 3 個刺青師');


  // 6. 建立 6 個服務
  const services: any[] = [];
  const serviceNames = [
    '小圖案刺青',
    '大圖案刺青',
    '刺青修復',
    '彩色刺青',
    '黑白刺青',
    '文字刺青',
  ];
  
  for (let i = 0; i < 6; i++) {
    const service = await prisma.service.create({
      data: {
        name: serviceNames[i],
        description: faker.lorem.sentence(),
        price: faker.number.int({ min: 2000, max: 15000 }),
        durationMin: faker.number.int({ min: 60, max: 300 }),
        category: faker.helpers.arrayElement(['Traditional', 'Modern', 'Custom']),
        createdAt: faker.date.past(),
      },
    });
    services.push(service);
  }
  console.log('✅ 建立 6 個服務');

  // 7. 建立 6 個預約
  const appointments: any[] = [];
  for (let i = 0; i < 6; i++) {
    const member = faker.helpers.arrayElement(members);
    const artist = faker.helpers.arrayElement(artists);
    const service = faker.helpers.arrayElement(services);
    const branch = branches.find((b: any) => b.id === artist.branchId)!;
    
    const startAt = faker.date.future();
    const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
    
    const appointment = await prisma.appointment.create({
      data: {
        userId: member.id,
        artistId: artist.user.id,
        serviceId: service.id,
        branchId: branch.id,
        startAt,
        endAt,
        status: faker.helpers.arrayElement(['PENDING', 'CONFIRMED', 'COMPLETED']),
        notes: faker.lorem.sentence(),
        createdAt: faker.date.past(),
      },
    });
    appointments.push(appointment);
  }
  console.log('✅ 建立 6 個預約');

  // 8. 建立 15 個訂單
  const orders: any[] = [];
  const usedAppointments = new Set();
  
  for (let i = 0; i < 15; i++) {
    const member = faker.helpers.arrayElement(members);
    const branch = faker.helpers.arrayElement(branches);
    const service = faker.helpers.arrayElement(services);
    
    // 隨機選擇是否關聯預約（避免重複）
    let appointmentId = null;
    if (Math.random() > 0.3 && usedAppointments.size < appointments.length) {
      const availableAppointments = appointments.filter((apt: any) => !usedAppointments.has(apt.id));
      if (availableAppointments.length > 0) {
        const appointment = faker.helpers.arrayElement(availableAppointments);
        appointmentId = appointment.id;
        usedAppointments.add(appointment.id);
      }
    }
    
    const paymentType = faker.helpers.arrayElement(['ONE_TIME', 'INSTALLMENT']);
    const totalAmount = service.price + faker.number.int({ min: 0, max: 5000 });
    
    const order = await prisma.order.create({
      data: {
        memberId: member.id,
        branchId: branch.id,
        appointmentId,
        totalAmount,
        paymentType: paymentType as any,
        status: faker.helpers.arrayElement(['UNPAID', 'PARTIALLY_PAID', 'PAID']),
        createdAt: faker.date.past(),
      },
    });
    orders.push(order);

    // 更新會員的財務資料
    // 如果是儲值訂單（隨機 20% 機率），更新儲值相關欄位
    const isStoredValueOrder = Math.random() < 0.2;
    if (isStoredValueOrder) {
      // 儲值訂單：增加餘額
      await prisma.member.update({
        where: { userId: member.id },
        data: {
          balance: { increment: totalAmount },
        },
      });
    } else {
      // 一般消費訂單：更新累計消費金額
      await prisma.member.update({
        where: { userId: member.id },
        data: {
          totalSpent: { increment: totalAmount },
        },
      });
    }

    // 如果是分期付款，建立分期記錄
    if (paymentType === 'INSTALLMENT') {
      const installmentCount = faker.number.int({ min: 3, max: 6 });
      const installmentAmount = Math.floor(totalAmount / installmentCount);
      const remainder = totalAmount - (installmentAmount * installmentCount);
      
      for (let j = 0; j < installmentCount; j++) {
        const amount = j === installmentCount - 1 ? installmentAmount + remainder : installmentAmount;
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + j + 1);
        
        // 隨機標記部分已付款
        const isPaid = faker.datatype.boolean({ probability: 0.3 });
        
        await prisma.installment.create({
          data: {
            orderId: order.id,
            installmentNo: j + 1,
            dueDate,
            amount,
            status: isPaid ? 'PAID' : 'UNPAID',
            paidAt: isPaid ? faker.date.past() : null,
            note: faker.lorem.sentence(),
          },
        });
      }
    }
  }
  console.log('✅ 建立 15 個訂單（包含分期記錄）');

  console.log('🎉 Seeding 完成！');
  console.log('📊 資料統計：');
  console.log(`   - BOSS: 1 個 (admin@test.com / 12345678)`);
  console.log(`   - 分店經理: ${managers.length} 個 (manager1@test.com, manager2@test.com, manager3@test.com / 12345678)`);
  console.log(`   - 會員: ${members.length} 個 (member1@test.com ~ member5@test.com / 12345678)`);
  console.log(`   - 刺青師: ${artists.length} 個 (artist1@test.com ~ artist3@test.com / 12345678)`);
  console.log(`   - 分店: ${branches.length} 個`);
  console.log(`   - 服務: ${services.length} 個`);
  console.log(`   - 預約: ${appointments.length} 個`);
  console.log(`   - 訂單: ${orders.length} 個`);
  console.log('💰 財務資料已更新到會員帳號中');
}

main()
  .catch((e) => {
    console.error('❌ Seeding 失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
