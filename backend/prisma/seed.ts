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

  // 2. 建立 2 個分店：三重店、東港店
  const branches: any[] = [];
  const branchData = [
    { name: '三重店', address: '新北市三重區重新路一段123號', phone: '02-2975-1234' },
    { name: '東港店', address: '屏東縣東港鎮沿海路356號, 928', phone: '08 831 1615' }
  ];
  
  for (let i = 0; i < 2; i++) {
    const branch = await prisma.branch.create({
      data: {
        name: branchData[i].name,
        address: branchData[i].address,
        phone: branchData[i].phone,
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
  console.log('✅ 建立 2 個分店：三重店、東港店');

  // 3. 建立 2 個分店經理（三重店、東港店各一位）
  const managers: any[] = [];
  const managerData = [
    { name: '三重店經理', email: 'manager1@test.com' },
    { name: '東港店經理', email: 'manager2@test.com' }
  ];
  
  for (let i = 0; i < 2; i++) {
    const manager = await prisma.user.create({
      data: {
        email: managerData[i].email,
        hashedPassword,
        name: managerData[i].name,
        role: 'BRANCH_MANAGER',
        phone: faker.phone.number(),
        branchId: branches[i].id,
        createdAt: faker.date.past(),
      },
    });
    managers.push(manager);
  }
  console.log('✅ 建立 2 個分店經理：三重店經理、東港店經理');

  // 4. 建立 12 個會員（平均分配到兩個分店，包含財務資料）
  const members: any[] = [];
  const memberData = [
    { name: "張小明", totalSpent: 25000, balance: 5000, membershipLevel: "Gold" },
    { name: "李美華", totalSpent: 45000, balance: 8000, membershipLevel: "Platinum" },
    { name: "王大偉", totalSpent: 15000, balance: 2000, membershipLevel: "Silver" },
    { name: "陳雅婷", totalSpent: 60000, balance: 12000, membershipLevel: "Platinum" },
    { name: "林志強", totalSpent: 8000, balance: 1500, membershipLevel: "Bronze" },
    { name: "黃淑芬", totalSpent: 35000, balance: 6000, membershipLevel: "Gold" },
    { name: "劉建國", totalSpent: 20000, balance: 3000, membershipLevel: "Silver" },
    { name: "吳佳玲", totalSpent: 50000, balance: 10000, membershipLevel: "Platinum" },
    { name: "陳志明", totalSpent: 18000, balance: 2500, membershipLevel: "Silver" },
    { name: "林雅芳", totalSpent: 42000, balance: 7500, membershipLevel: "Gold" },
    { name: "黃建華", totalSpent: 12000, balance: 1800, membershipLevel: "Bronze" },
    { name: "王美玲", totalSpent: 55000, balance: 11000, membershipLevel: "Platinum" },
  ];
  
  for (let i = 0; i < 12; i++) {
    const user = await prisma.user.create({
      data: {
        email: `member${i + 1}@test.com`,
        hashedPassword,
        name: memberData[i].name,
        role: 'MEMBER',
        phone: faker.phone.number(),
        birthday: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
        gender: faker.helpers.arrayElement(['MALE', 'FEMALE', 'OTHER']),
        branchId: branches[i % 2].id, // 輪流分配到2個分店
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
  console.log('✅ 建立 12 個會員帳號（平均分配到兩個分店，包含財務資料）');

  // 5. 建立 3 個刺青師（東港店1位，三重店2位）
  const artists: any[] = [];
  const artistData = [
    { name: "陳震宇", bio: "專精日式刺青，擁有15年經驗，擅長龍鳳、櫻花等傳統圖案。風格沉穩內斂，注重細節與傳統美學的完美結合。身穿黑色高領毛衣，展現專業與內斂的氣質。雙臂滿布精緻的日式刺青，是傳統刺青藝術的傳承者。", speciality: "日式傳統刺青", portfolioUrl: "https://portfolio.example.com/artist1", photoUrl: "/images/artists/chen-zhenyu.jpeg", branchIndex: 1 }, // 東港店 - 阿龍師傅照片
    { name: "黃晨洋", bio: "專精幾何圖騰，現代風格專家，擅長線條藝術。融合當代藝術與刺青技藝，創造獨特的視覺語言。年輕有活力，對藝術有獨特見解。喜歡在藝廊中尋找靈感，將現代藝術元素融入刺青設計。", speciality: "幾何圖騰設計", portfolioUrl: "https://portfolio.example.com/artist2", photoUrl: "/images/artists/huang-chenyang.jpeg", branchIndex: 0 }, // 三重店 - 年輕男性在藝廊中
    { name: "林承葉", bio: "專精黑灰寫實，細節完美主義者，擅長肖像刺青。以精湛的技藝呈現光影層次，每件作品都是藝術品。戴眼鏡展現專業形象，穿著時尚皮夾克。左前臂有彩色刺青作品，展現多元化的刺青風格。", speciality: "黑灰寫實風格", portfolioUrl: "https://portfolio.example.com/artist3", photoUrl: "/images/artists/lin-chengye.jpeg", branchIndex: 0 }, // 三重店 - 戴眼鏡穿皮夾克
  ];
  
  for (let i = 0; i < 3; i++) {
    const artistUser = await prisma.user.create({
      data: {
        email: `artist${i + 1}@test.com`,
        hashedPassword,
        name: artistData[i].name,
        role: 'ARTIST',
        phone: faker.phone.number(),
        branchId: branches[artistData[i].branchIndex].id,
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
        photoUrl: artistData[i].photoUrl,
        styles: [
          faker.helpers.arrayElement(['Traditional', 'Realistic', 'Japanese', 'Blackwork', 'Watercolor']),
          faker.helpers.arrayElement(['Geometric', 'Minimalist', 'Portrait', 'Nature', 'Abstract']),
        ],
        branchId: branches[artistData[i].branchIndex].id,
        active: true,
        createdAt: faker.date.past(),
      },
    });
    artists.push({ ...artist, user: artistUser });
  }
  console.log('✅ 建立 3 個刺青師（東港店1位：陳震宇，三重店2位：黃晨洋、林承葉）');


  // 6. 建立 10 個服務
  const services: any[] = [];
  const serviceData = [
    { name: '小圖案刺青', price: 3000, duration: 60, category: 'Basic' },
    { name: '大圖案刺青', price: 15000, duration: 300, category: 'Advanced' },
    { name: '刺青修復', price: 8000, duration: 180, category: 'Repair' },
    { name: '彩色刺青', price: 12000, duration: 240, category: 'Color' },
    { name: '黑白刺青', price: 10000, duration: 200, category: 'Blackwork' },
    { name: '文字刺青', price: 2500, duration: 45, category: 'Text' },
    { name: '日式傳統刺青', price: 20000, duration: 360, category: 'Traditional' },
    { name: '幾何圖騰', price: 8000, duration: 150, category: 'Geometric' },
    { name: '肖像刺青', price: 25000, duration: 480, category: 'Portrait' },
    { name: '水彩風格', price: 18000, duration: 300, category: 'Watercolor' },
  ];
  
  for (let i = 0; i < 10; i++) {
    const service = await prisma.service.create({
      data: {
        name: serviceData[i].name,
        description: `${serviceData[i].name}服務，專業技術，品質保證`,
        price: serviceData[i].price,
        durationMin: serviceData[i].duration,
        category: serviceData[i].category,
        createdAt: faker.date.past(),
      },
    });
    services.push(service);
  }
  console.log('✅ 建立 10 個服務');

  // 7. 建立預約（按照刺青師平均分配）
  const appointments: any[] = [];
  
  // 為每個刺青師創建預約
  for (let artistIndex = 0; artistIndex < artists.length; artistIndex++) {
    const artist = artists[artistIndex];
    const branch = branches.find((b: any) => b.id === artist.branchId)!;
    
    // 每個刺青師分配 8 個預約
    for (let i = 0; i < 8; i++) {
      const member = faker.helpers.arrayElement(members.filter((m: any) => m.branchId === artist.branchId));
      const service = faker.helpers.arrayElement(services);
      
      // 創建不同時間的預約
      let startAt: Date;
      if (i < 2) {
        // 前2個：今日預約
        startAt = new Date();
        startAt.setHours(9 + i * 3, 0, 0, 0);
      } else if (i < 4) {
        // 第3-4個：本週預約
        startAt = new Date();
        startAt.setDate(startAt.getDate() + 2 + (i - 2));
        startAt.setHours(10 + (i - 2) * 2, 0, 0, 0);
      } else {
        // 第5-8個：未來預約
        startAt = faker.date.future();
        startAt.setHours(9 + (i % 4) * 2, 0, 0, 0);
      }
      
      const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
      
      const appointment = await prisma.appointment.create({
        data: {
          userId: member.id,
          artistId: artist.user.id,
          serviceId: service.id,
          branchId: branch.id,
          startAt,
          endAt,
          status: faker.helpers.arrayElement(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED']),
          notes: `${artist.displayName} 的預約 - ${service.name}`,
          createdAt: faker.date.past(),
        },
      });
      appointments.push(appointment);
    }
  }
  console.log('✅ 建立預約（按照刺青師平均分配，每位刺青師8個預約）');

  // 8. 模擬預約完成流程：將部分預約標記為 COMPLETED，自動生成訂單
  const orders: any[] = [];
  const completedAppointments: any[] = [];
  
  // 隨機選擇 15 個預約標記為 COMPLETED（約 50% 的預約會完成）
  const appointmentsToComplete = faker.helpers.arrayElements(appointments, 15);
  
  for (const appointment of appointmentsToComplete) {
    // 更新預約狀態為 COMPLETED
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'COMPLETED' },
    });
    completedAppointments.push(updatedAppointment);
    
    // 為完成的預約自動生成訂單
    const service = services.find((s: any) => s.id === appointment.serviceId);
    if (service) {
      const totalAmount = service.price + faker.number.int({ min: 0, max: 5000 });
      
      const order = await prisma.order.create({
        data: {
          memberId: appointment.userId,
          branchId: appointment.branchId,
          appointmentId: appointment.id,
          totalAmount,
          finalAmount: totalAmount,
          paymentType: 'ONE_TIME', // 預設為一次付清，結帳時再決定
          status: 'PENDING_PAYMENT', // 預設為待結帳狀態
          isInstallment: false,
          createdAt: faker.date.past(),
        },
      });
      orders.push(order);

      // 更新預約的 orderId
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { orderId: order.id },
      });
    }
  }
  
  console.log('✅ 模擬預約完成流程：15 個預約標記為 COMPLETED，自動生成對應訂單');
  
  // 9. 為部分訂單模擬結帳流程（一次付清和分期付款）
  const ordersToCheckout = faker.helpers.arrayElements(orders, 10); // 隨機選擇 10 個訂單進行結帳
  
  for (const order of ordersToCheckout) {
    const paymentType = faker.helpers.arrayElement(['ONE_TIME', 'INSTALLMENT']);
    
    if (paymentType === 'ONE_TIME') {
      // 一次付清
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          status: 'PAID',
          paymentType: 'ONE_TIME',
          paidAt: faker.date.past(),
        },
      });
    } else {
      // 分期付款
      const installmentCount = faker.number.int({ min: 3, max: 6 });
      const installmentAmount = Math.floor(order.totalAmount / installmentCount);
      const remainder = order.totalAmount - (installmentAmount * installmentCount);
      
      // 更新訂單狀態
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          status: 'INSTALLMENT_ACTIVE',
          paymentType: 'INSTALLMENT',
          isInstallment: true,
        },
      });
      
      // 創建分期記錄
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
            notes: faker.lorem.sentence(),
          },
        });
      }
    }
  }
  
  console.log('✅ 模擬結帳流程：10 個訂單完成結帳（一次付清和分期付款）');

  console.log('🎉 Seeding 完成！');
  console.log('📊 資料統計：');
  console.log(`   - BOSS: 1 個 (admin@test.com / 12345678)`);
  console.log(`   - 分店經理: ${managers.length} 個 (manager1@test.com, manager2@test.com / 12345678)`);
  console.log(`   - 會員: ${members.length} 個 (member1@test.com ~ member12@test.com / 12345678)`);
  console.log(`   - 刺青師: ${artists.length} 個 (artist1@test.com ~ artist3@test.com / 12345678)`);
  console.log(`   - 分店: ${branches.length} 個 (三重店、東港店)`);
  console.log(`   - 服務: ${services.length} 個`);
  console.log(`   - 預約: ${appointments.length} 個 (每位刺青師8個預約)`);
  console.log(`   - 完成預約: ${completedAppointments.length} 個 (自動生成訂單)`);
  console.log(`   - 訂單: ${orders.length} 個 (待結帳和已結帳)`);
  console.log('💰 財務資料已更新到會員帳號中');
  console.log('🏪 分店配置：');
  console.log('   - 東港店：陳震宇 (1位刺青師)');
  console.log('   - 三重店：黃晨洋、林承葉 (2位刺青師)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding 失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
