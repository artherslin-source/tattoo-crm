import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始執行完整數據重建...');
  
  // 清理現有資料（按外鍵約束順序）
  console.log('🧹 清理現有資料...');
  
  // 先清理有外鍵依賴的表
  await prisma.installment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.serviceHistory.deleteMany();
  
  // 再清理被依賴的表
  await prisma.artist.deleteMany();
  await prisma.member.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

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
      createdAt: new Date('2024-01-01'),
    },
  });
  console.log('✅ 建立管理員帳號:', admin.email);

  // 2. 建立分店：三重店、東港店
  const branches = await Promise.all([
    prisma.branch.create({
      data: {
        name: '三重店',
        address: '新北市三重區重新路一段123號',
        phone: '02-2975-1234',
        businessHours: {
          monday: '09:00-18:00',
          tuesday: '09:00-18:00',
          wednesday: '09:00-18:00',
          thursday: '09:00-18:00',
          friday: '09:00-18:00',
          saturday: '10:00-16:00',
          sunday: 'closed',
        },
        createdAt: new Date('2024-01-01'),
      },
    }),
    prisma.branch.create({
      data: {
        name: '東港店',
        address: '屏東縣東港鎮沿海路356號',
        phone: '08-831-1615',
        businessHours: {
          monday: '09:00-18:00',
          tuesday: '09:00-18:00',
          wednesday: '09:00-18:00',
          thursday: '09:00-18:00',
          friday: '09:00-18:00',
          saturday: '10:00-16:00',
          sunday: 'closed',
        },
        createdAt: new Date('2024-01-01'),
      },
    }),
  ]);
  console.log('✅ 建立 2 個分店（三重店、東港店）');

  // 3. 建立分店經理
  const managers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'manager1@test.com',
        hashedPassword,
        name: '三重店經理',
        role: 'BRANCH_MANAGER',
        phone: faker.phone.number(),
        branchId: branches[0].id,
        createdAt: new Date('2024-01-01'),
      },
    }),
    prisma.user.create({
      data: {
        email: 'manager2@test.com',
        hashedPassword,
        name: '東港店經理',
        role: 'BRANCH_MANAGER',
        phone: faker.phone.number(),
        branchId: branches[1].id,
        createdAt: new Date('2024-01-01'),
      },
    }),
  ]);
  console.log('✅ 建立 2 個分店經理');

  // 4. 建立刺青師
  const artistUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'artist1@test.com',
        hashedPassword,
        name: '陳震宇',
        role: 'ARTIST',
        phone: faker.phone.number(),
        branchId: branches[1].id, // 東港店
        createdAt: new Date('2024-01-01'),
      },
    }),
    prisma.user.create({
      data: {
        email: 'artist2@test.com',
        hashedPassword,
        name: '黃晨洋',
        role: 'ARTIST',
        phone: faker.phone.number(),
        branchId: branches[0].id, // 三重店
        createdAt: new Date('2024-01-01'),
      },
    }),
    prisma.user.create({
      data: {
        email: 'artist3@test.com',
        hashedPassword,
        name: '林承葉',
        role: 'ARTIST',
        phone: faker.phone.number(),
        branchId: branches[0].id, // 三重店
        createdAt: new Date('2024-01-01'),
      },
    }),
  ]);

  const artists = await Promise.all([
    prisma.artist.create({
      data: {
        userId: artistUsers[0].id,
        displayName: '陳震宇',
        bio: '專精日式刺青，擁有15年經驗，擅長龍鳳、櫻花等傳統圖案。',
        speciality: '日式傳統刺青',
        portfolioUrl: 'https://portfolio.example.com/artist1',
        photoUrl: '/images/artists/chen-zhenyu.jpeg',
        styles: ['Traditional', 'Japanese'],
        branchId: branches[1].id,
        active: true,
        createdAt: new Date('2024-01-01'),
      },
    }),
    prisma.artist.create({
      data: {
        userId: artistUsers[1].id,
        displayName: '黃晨洋',
        bio: '專精幾何圖騰，現代風格專家，擅長線條藝術。',
        speciality: '幾何圖騰設計',
        portfolioUrl: 'https://portfolio.example.com/artist2',
        photoUrl: '/images/artists/huang-chenyang.jpeg',
        styles: ['Geometric', 'Minimalist'],
        branchId: branches[0].id,
        active: true,
        createdAt: new Date('2024-01-01'),
      },
    }),
    prisma.artist.create({
      data: {
        userId: artistUsers[2].id,
        displayName: '林承葉',
        bio: '專精黑灰寫實，細節完美主義者，擅長肖像刺青。',
        speciality: '黑灰寫實風格',
        portfolioUrl: 'https://portfolio.example.com/artist3',
        photoUrl: '/images/artists/lin-chengye.jpeg',
        styles: ['Realistic', 'Portrait'],
        branchId: branches[0].id,
        active: true,
        createdAt: new Date('2024-01-01'),
      },
    }),
  ]);
  console.log('✅ 建立 3 個刺青師（東港店1位：陳震宇，三重店2位：黃晨洋、林承葉）');

  // 5. 建立會員
  const memberUsers = [];
  const members = [];
  
  for (let i = 0; i < 12; i++) {
    const user = await prisma.user.create({
      data: {
        email: `member${i + 1}@test.com`,
        hashedPassword,
        name: `會員${i + 1}`,
        role: 'MEMBER',
        phone: faker.phone.number(),
        birthday: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
        gender: faker.helpers.arrayElement(['MALE', 'FEMALE', 'OTHER']),
        branchId: branches[i % 2].id, // 輪流分配到2個分店
        createdAt: new Date('2024-01-01'),
      },
    });

    const member = await prisma.member.create({
      data: {
        userId: user.id,
        totalSpent: faker.number.int({ min: 0, max: 100000 }),
        balance: faker.number.int({ min: 0, max: 20000 }),
        membershipLevel: faker.helpers.arrayElement(['Bronze', 'Silver', 'Gold', 'Platinum']),
      },
    });

    memberUsers.push(user);
    members.push({ ...user, member });
  }
  console.log('✅ 建立 12 個會員');

  // 6. 建立服務項目
  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: '大背到大腿圖',
        description: '大背到大腿圖服務，專業技術，品質保證',
        price: 70000,
        durationMin: 720,
        category: 'Back',
        createdAt: new Date('2024-01-01'),
      },
    }),
    prisma.service.create({
      data: {
        name: '大背後圖',
        description: '大背後圖服務，專業技術，品質保證',
        price: 55000,
        durationMin: 540,
        category: 'Back',
        createdAt: new Date('2024-01-01'),
      },
    }),
    prisma.service.create({
      data: {
        name: '小腿全包',
        description: '小腿全包服務，專業技術，品質保證',
        price: 38000,
        durationMin: 420,
        category: 'Leg',
        createdAt: new Date('2024-01-01'),
      },
    }),
    prisma.service.create({
      data: {
        name: '排肚圖',
        description: '排肚圖服務，專業技術，品質保證',
        price: 32000,
        durationMin: 360,
        category: 'Torso',
        createdAt: new Date('2024-01-01'),
      },
    }),
    prisma.service.create({
      data: {
        name: '單胸口',
        description: '單胸口服務，專業技術，品質保證',
        price: 22000,
        durationMin: 240,
        category: 'Torso',
        createdAt: new Date('2024-01-01'),
      },
    }),
    prisma.service.create({
      data: {
        name: '半臂圖',
        description: '半臂圖服務，專業技術，品質保證',
        price: 35000,
        durationMin: 360,
        category: 'Arm',
        createdAt: new Date('2024-01-01'),
      },
    }),
  ]);
  console.log('✅ 建立 6 個服務項目');

  // 7. 建立不同時間段的預約和訂單數據
  
  // 創建時間點
  const now = new Date();
  const timePoints = {
    // 近7天
    last7Days: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    // 近30天
    last30Days: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    // 近90天
    last90Days: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    // 近一年
    lastYear: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    // 本月1日
    thisMonth: new Date(now.getFullYear(), now.getMonth(), 1),
  };

  console.log('📅 時間點設定：');
  console.log(`   - 現在: ${now.toISOString()}`);
  console.log(`   - 近7天: ${timePoints.last7Days.toISOString()}`);
  console.log(`   - 近30天: ${timePoints.last30Days.toISOString()}`);
  console.log(`   - 近90天: ${timePoints.last90Days.toISOString()}`);
  console.log(`   - 近一年: ${timePoints.lastYear.toISOString()}`);
  console.log(`   - 本月1日: ${timePoints.thisMonth.toISOString()}`);

  // 創建不同時間段的數據
  const appointments = [];
  const orders = [];
  const installments = [];

  // 近7天數據（2個訂單）
  for (let i = 0; i < 2; i++) {
    const member = members[i % members.length];
    const artist = artists[i % artists.length];
    const service = services[i % services.length];
    const branch = branches.find(b => b.id === artist.branchId)!;
    
    const startAt = new Date(timePoints.last7Days.getTime() + i * 2 * 24 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
    
    const appointment = await prisma.appointment.create({
      data: {
        userId: member.id,
        artistId: artist.userId,
        serviceId: service.id,
        branchId: branch.id,
        startAt,
        endAt,
        status: 'COMPLETED',
        notes: `近7天預約 - ${service.name}`,
        createdAt: startAt,
      },
    });
    appointments.push(appointment);

    const order = await prisma.order.create({
      data: {
        memberId: member.id,
        branchId: branch.id,
        appointmentId: appointment.id,
        totalAmount: service.price,
        finalAmount: service.price,
        paymentType: 'ONE_TIME',
        status: 'PAID',
        isInstallment: false,
        paidAt: startAt,
        createdAt: startAt,
      },
    });
    orders.push(order);

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { orderId: order.id },
    });
  }

  // 近30天數據（5個訂單）
  for (let i = 0; i < 5; i++) {
    const member = members[i % members.length];
    const artist = artists[i % artists.length];
    const service = services[i % services.length];
    const branch = branches.find(b => b.id === artist.branchId)!;
    
    const startAt = new Date(timePoints.last30Days.getTime() + i * 5 * 24 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
    
    const appointment = await prisma.appointment.create({
      data: {
        userId: member.id,
        artistId: artist.userId,
        serviceId: service.id,
        branchId: branch.id,
        startAt,
        endAt,
        status: 'COMPLETED',
        notes: `近30天預約 - ${service.name}`,
        createdAt: startAt,
      },
    });
    appointments.push(appointment);

    const order = await prisma.order.create({
      data: {
        memberId: member.id,
        branchId: branch.id,
        appointmentId: appointment.id,
        totalAmount: service.price,
        finalAmount: service.price,
        paymentType: 'ONE_TIME',
        status: 'PAID',
        isInstallment: false,
        paidAt: startAt,
        createdAt: startAt,
      },
    });
    orders.push(order);

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { orderId: order.id },
    });
  }

  // 近90天數據（8個訂單，包含分期付款）
  for (let i = 0; i < 8; i++) {
    const member = members[i % members.length];
    const artist = artists[i % artists.length];
    const service = services[i % services.length];
    const branch = branches.find(b => b.id === artist.branchId)!;
    
    const startAt = new Date(timePoints.last90Days.getTime() + i * 10 * 24 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
    
    const appointment = await prisma.appointment.create({
      data: {
        userId: member.id,
        artistId: artist.userId,
        serviceId: service.id,
        branchId: branch.id,
        startAt,
        endAt,
        status: 'COMPLETED',
        notes: `近90天預約 - ${service.name}`,
        createdAt: startAt,
      },
    });
    appointments.push(appointment);

    // 一半一次付清，一半分期付款
    const isInstallment = i % 2 === 0;
    
    const order = await prisma.order.create({
      data: {
        memberId: member.id,
        branchId: branch.id,
        appointmentId: appointment.id,
        totalAmount: service.price,
        finalAmount: service.price,
        paymentType: isInstallment ? 'INSTALLMENT' : 'ONE_TIME',
        status: isInstallment ? 'INSTALLMENT_ACTIVE' : 'PAID',
        isInstallment,
        paidAt: isInstallment ? null : startAt,
        createdAt: startAt,
      },
    });
    orders.push(order);

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { orderId: order.id },
    });

    // 如果是分期付款，創建分期記錄
    if (isInstallment) {
      const installmentCount = 4;
      const installmentAmount = Math.floor(service.price / installmentCount);
      const remainder = service.price - (installmentAmount * installmentCount);
      
      for (let j = 0; j < installmentCount; j++) {
        const amount = j === installmentCount - 1 ? installmentAmount + remainder : installmentAmount;
        const dueDate = new Date(startAt);
        dueDate.setMonth(dueDate.getMonth() + j + 1);
        
        // 前兩期已付款
        const isPaid = j < 2;
        
        const installment = await prisma.installment.create({
          data: {
            orderId: order.id,
            installmentNo: j + 1,
            dueDate,
            amount,
            status: isPaid ? 'PAID' : 'UNPAID',
            paidAt: isPaid ? new Date(startAt.getTime() + (j + 1) * 30 * 24 * 60 * 60 * 1000) : null,
            paymentMethod: 'CASH',
            notes: `第${j + 1}期付款`,
          },
        });
        installments.push(installment);
      }
    }
  }

  // 近一年數據（15個訂單，包含分期付款）
  for (let i = 0; i < 15; i++) {
    const member = members[i % members.length];
    const artist = artists[i % artists.length];
    const service = services[i % services.length];
    const branch = branches.find(b => b.id === artist.branchId)!;
    
    const startAt = new Date(timePoints.lastYear.getTime() + i * 20 * 24 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
    
    const appointment = await prisma.appointment.create({
      data: {
        userId: member.id,
        artistId: artist.userId,
        serviceId: service.id,
        branchId: branch.id,
        startAt,
        endAt,
        status: 'COMPLETED',
        notes: `近一年預約 - ${service.name}`,
        createdAt: startAt,
      },
    });
    appointments.push(appointment);

    // 70%一次付清，30%分期付款
    const isInstallment = i % 3 === 0;
    
    const order = await prisma.order.create({
      data: {
        memberId: member.id,
        branchId: branch.id,
        appointmentId: appointment.id,
        totalAmount: service.price,
        finalAmount: service.price,
        paymentType: isInstallment ? 'INSTALLMENT' : 'ONE_TIME',
        status: isInstallment ? 'INSTALLMENT_ACTIVE' : 'PAID',
        isInstallment,
        paidAt: isInstallment ? null : startAt,
        createdAt: startAt,
      },
    });
    orders.push(order);

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { orderId: order.id },
    });

    // 如果是分期付款，創建分期記錄
    if (isInstallment) {
      const installmentCount = 5;
      const installmentAmount = Math.floor(service.price / installmentCount);
      const remainder = service.price - (installmentAmount * installmentCount);
      
      for (let j = 0; j < installmentCount; j++) {
        const amount = j === installmentCount - 1 ? installmentAmount + remainder : installmentAmount;
        const dueDate = new Date(startAt);
        dueDate.setMonth(dueDate.getMonth() + j + 1);
        
        // 前3期已付款
        const isPaid = j < 3;
        
        const installment = await prisma.installment.create({
          data: {
            orderId: order.id,
            installmentNo: j + 1,
            dueDate,
            amount,
            status: isPaid ? 'PAID' : 'UNPAID',
            paidAt: isPaid ? new Date(startAt.getTime() + (j + 1) * 30 * 24 * 60 * 60 * 1000) : null,
            paymentMethod: 'CASH',
            notes: `第${j + 1}期付款`,
          },
        });
        installments.push(installment);
      }
    }
  }

  // 本月數據（3個訂單）
  for (let i = 0; i < 3; i++) {
    const member = members[i % members.length];
    const artist = artists[i % artists.length];
    const service = services[i % services.length];
    const branch = branches.find(b => b.id === artist.branchId)!;
    
    const startAt = new Date(timePoints.thisMonth.getTime() + i * 5 * 24 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
    
    const appointment = await prisma.appointment.create({
      data: {
        userId: member.id,
        artistId: artist.userId,
        serviceId: service.id,
        branchId: branch.id,
        startAt,
        endAt,
        status: 'COMPLETED',
        notes: `本月預約 - ${service.name}`,
        createdAt: startAt,
      },
    });
    appointments.push(appointment);

    const order = await prisma.order.create({
      data: {
        memberId: member.id,
        branchId: branch.id,
        appointmentId: appointment.id,
        totalAmount: service.price,
        finalAmount: service.price,
        paymentType: 'ONE_TIME',
        status: 'PAID',
        isInstallment: false,
        paidAt: startAt,
        createdAt: startAt,
      },
    });
    orders.push(order);

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { orderId: order.id },
    });
  }

  console.log('✅ 建立不同時間段的預約和訂單數據');
  console.log(`   - 預約總數: ${appointments.length}`);
  console.log(`   - 訂單總數: ${orders.length}`);
  console.log(`   - 分期付款總數: ${installments.length}`);

  // 8. 計算並顯示統計數據
  const totalRevenue = orders.reduce((sum, order) => {
    if (order.paymentType === 'ONE_TIME' && order.status === 'PAID') {
      return sum + order.finalAmount;
    }
    return sum;
  }, 0);

  const installmentRevenue = installments
    .filter(inst => inst.status === 'PAID')
    .reduce((sum, inst) => sum + inst.amount, 0);

  const thisMonthRevenue = orders
    .filter(order => {
      const paidAt = order.paidAt;
      return paidAt && paidAt >= timePoints.thisMonth && order.status === 'PAID';
    })
    .reduce((sum, order) => sum + order.finalAmount, 0);

  const thisMonthInstallmentRevenue = installments
    .filter(inst => {
      const paidAt = inst.paidAt;
      return paidAt && paidAt >= timePoints.thisMonth && inst.status === 'PAID';
    })
    .reduce((sum, inst) => sum + inst.amount, 0);

  console.log('📊 數據統計：');
  console.log(`   - 一次付清營收: NT$ ${totalRevenue.toLocaleString()}`);
  console.log(`   - 分期付款營收: NT$ ${installmentRevenue.toLocaleString()}`);
  console.log(`   - 總營收: NT$ ${(totalRevenue + installmentRevenue).toLocaleString()}`);
  console.log(`   - 本月營收: NT$ ${(thisMonthRevenue + thisMonthInstallmentRevenue).toLocaleString()}`);

  console.log('🎉 完整數據重建完成！');
  console.log('📊 資料統計：');
  console.log(`   - BOSS: 1 個 (admin@test.com / 12345678)`);
  console.log(`   - 分店經理: ${managers.length} 個 (manager1@test.com, manager2@test.com / 12345678)`);
  console.log(`   - 會員: ${members.length} 個 (member1@test.com ~ member12@test.com / 12345678)`);
  console.log(`   - 刺青師: ${artists.length} 個 (artist1@test.com ~ artist3@test.com / 12345678)`);
  console.log(`   - 分店: ${branches.length} 個 (三重店、東港店)`);
  console.log(`   - 服務: ${services.length} 個`);
  console.log(`   - 預約: ${appointments.length} 個`);
  console.log(`   - 訂單: ${orders.length} 個`);
  console.log(`   - 分期付款: ${installments.length} 個`);
  console.log('💰 財務資料已更新到會員帳號中');
  console.log('🏪 分店配置：');
  console.log('   - 東港店：陳震宇 (1位刺青師)');
  console.log('   - 三重店：黃晨洋、林承葉 (2位刺青師)');
}

main()
  .catch((e) => {
    console.error('❌ 數據重建失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
