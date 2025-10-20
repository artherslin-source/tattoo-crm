import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 業務流程：聯絡 → 預約 → 訂單
// 1. 客戶聯絡（Contact）
// 2. 人員協助預約（Appointment）
// 3. 服務完成後產生訂單（Order）

interface BusinessDataConfig {
  contactsCount: number;        // 聯絡記錄數量
  appointmentsCount: number;    // 預約記錄數量
  ordersCount: number;          // 訂單記錄數量
  dateRange: {
    start: Date;
    end: Date;
  };
}

async function generateBusinessData(config: BusinessDataConfig) {
  console.log('🏢 開始生成符合真實業務流程的資料...');
  console.log(`📞 聯絡記錄: ${config.contactsCount} 筆`);
  console.log(`📅 預約記錄: ${config.appointmentsCount} 筆`);
  console.log(`💰 訂單記錄: ${config.ordersCount} 筆`);
  console.log('');

  try {
    // 1. 獲取現有資料
    const branches = await prisma.branch.findMany();
    const artists = await prisma.artist.findMany({
      include: { user: true }
    });
    const services = await prisma.service.findMany();

    if (branches.length === 0 || artists.length === 0 || services.length === 0) {
      throw new Error('缺少必要的基礎資料：分店、刺青師或服務項目');
    }

    console.log(`✅ 找到 ${branches.length} 個分店`);
    console.log(`✅ 找到 ${artists.length} 個刺青師`);
    console.log(`✅ 找到 ${services.length} 個服務項目`);
    console.log('');

    // 2. 生成聯絡記錄
    console.log('📞 生成聯絡記錄...');
    const contacts = [];
    
    for (let i = 0; i < config.contactsCount; i++) {
      const contact = await prisma.contact.create({
        data: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          message: generateContactMessage(),
          status: faker.helpers.arrayElement(['NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED']),
          source: faker.helpers.arrayElement(['WEBSITE', 'PHONE', 'WALK_IN', 'REFERRAL']),
          priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH']),
          assignedTo: faker.helpers.arrayElement(artists).id,
          branchId: faker.helpers.arrayElement(branches).id,
          createdAt: faker.date.between(config.dateRange.start, config.dateRange.end),
          updatedAt: faker.date.between(config.dateRange.start, config.dateRange.end),
        }
      });
      contacts.push(contact);
    }
    console.log(`✅ 生成 ${contacts.length} 筆聯絡記錄`);

    // 3. 生成預約記錄（基於聯絡記錄）
    console.log('📅 生成預約記錄...');
    const appointments = [];
    
    // 選擇部分聯絡記錄轉為預約
    const contactsForAppointment = faker.helpers.arrayElements(
      contacts, 
      Math.min(config.appointmentsCount, contacts.length)
    );

    for (let i = 0; i < contactsForAppointment.length; i++) {
      const contact = contactsForAppointment[i];
      const service = faker.helpers.arrayElement(services);
      const artist = faker.helpers.arrayElement(artists);
      const branch = faker.helpers.arrayElement(branches);
      
      // 確保刺青師和分店匹配
      const matchingArtist = artists.find(a => a.branchId === branch.id) || artist;
      
      const appointmentDate = faker.date.between(config.dateRange.start, config.dateRange.end);
      const duration = service.durationMin;
      const endDate = new Date(appointmentDate.getTime() + duration * 60000);

      const appointment = await prisma.appointment.create({
        data: {
          branchId: branch.id,
          artistId: matchingArtist.id,
          serviceId: service.id,
          contactId: contact.id,
          startAt: appointmentDate,
          endAt: endDate,
          status: faker.helpers.arrayElement(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
          notes: generateAppointmentNotes(),
          createdAt: faker.date.between(config.dateRange.start, appointmentDate),
          updatedAt: faker.date.between(appointmentDate, config.dateRange.end),
        }
      });
      appointments.push(appointment);

      // 更新聯絡記錄狀態
      await prisma.contact.update({
        where: { id: contact.id },
        data: { 
          status: 'SCHEDULED',
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ 生成 ${appointments.length} 筆預約記錄`);

    // 4. 生成訂單記錄（基於完成的預約）
    console.log('💰 生成訂單記錄...');
    const orders = [];
    
    // 選擇部分預約轉為訂單（通常是已完成的預約）
    const completedAppointments = appointments.filter(apt => 
      apt.status === 'COMPLETED' || faker.datatype.boolean({ probability: 0.7 })
    );

    for (let i = 0; i < Math.min(config.ordersCount, completedAppointments.length); i++) {
      const appointment = completedAppointments[i];
      const service = services.find(s => s.id === appointment.serviceId)!;
      
      // 生成訂單金額（基於服務價格，可能有折扣）
      const baseAmount = service.price;
      const discount = faker.datatype.boolean({ probability: 0.3 }) 
        ? faker.number.int({ min: 0, max: baseAmount * 0.2 }) 
        : 0;
      const finalAmount = baseAmount - discount;

      const order = await prisma.order.create({
        data: {
          userId: faker.helpers.arrayElement(artists).user.id, // 客戶ID
          branchId: appointment.branchId,
          artistId: appointment.artistId,
          serviceId: appointment.serviceId,
          appointmentId: appointment.id,
          totalAmount: baseAmount,
          discountAmount: discount,
          finalAmount: finalAmount,
          status: faker.helpers.arrayElement(['PENDING', 'PAID', 'COMPLETED', 'CANCELLED']),
          paymentType: faker.helpers.arrayElement(['CASH', 'CARD', 'TRANSFER', 'INSTALLMENT']),
          paymentStatus: faker.helpers.arrayElement(['PENDING', 'PAID', 'FAILED']),
          paidAt: faker.datatype.boolean({ probability: 0.8 }) 
            ? faker.date.between(appointment.startAt, config.dateRange.end)
            : null,
          notes: generateOrderNotes(),
          createdAt: faker.date.between(appointment.startAt, config.dateRange.end),
          updatedAt: faker.date.between(appointment.startAt, config.dateRange.end),
        }
      });
      orders.push(order);

      // 更新預約狀態
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { 
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ 生成 ${orders.length} 筆訂單記錄`);

    // 5. 生成分期付款記錄（部分訂單）
    console.log('💳 生成分期付款記錄...');
    const installmentOrders = faker.helpers.arrayElements(
      orders.filter(o => o.paymentType === 'INSTALLMENT'),
      Math.min(5, orders.length)
    );

    for (const order of installmentOrders) {
      const installmentCount = faker.number.int({ min: 2, max: 6 });
      const installmentAmount = Math.floor(order.finalAmount / installmentCount);
      const remainder = order.finalAmount - (installmentAmount * installmentCount);

      for (let i = 1; i <= installmentCount; i++) {
        const amount = i === installmentCount ? installmentAmount + remainder : installmentAmount;
        const isPaid = faker.datatype.boolean({ probability: 0.6 });
        
        await prisma.installment.create({
          data: {
            orderId: order.id,
            installmentNo: i,
            amount: amount,
            dueDate: faker.date.between(order.createdAt, config.dateRange.end),
            paidAt: isPaid ? faker.date.between(order.createdAt, config.dateRange.end) : null,
            status: isPaid ? 'PAID' : 'PENDING',
            createdAt: order.createdAt,
            updatedAt: new Date(),
          }
        });
      }
    }
    console.log(`✅ 生成 ${installmentOrders.length} 筆訂單的分期付款記錄`);

    // 6. 生成統計報告
    console.log('');
    console.log('📊 業務資料統計：');
    console.log(`📞 聯絡記錄: ${contacts.length} 筆`);
    console.log(`📅 預約記錄: ${appointments.length} 筆`);
    console.log(`💰 訂單記錄: ${orders.length} 筆`);
    console.log(`💳 分期付款: ${installmentOrders.length} 筆訂單`);
    
    // 按分店統計
    console.log('');
    console.log('🏢 分店業績統計：');
    for (const branch of branches) {
      const branchOrders = orders.filter(o => o.branchId === branch.id);
      const branchRevenue = branchOrders.reduce((sum, o) => sum + o.finalAmount, 0);
      console.log(`  ${branch.name}: ${branchOrders.length} 筆訂單, 營收 NT$ ${branchRevenue.toLocaleString()}`);
    }

    // 按刺青師統計
    console.log('');
    console.log('👨‍🎨 刺青師業績統計：');
    for (const artist of artists) {
      const artistOrders = orders.filter(o => o.artistId === artist.id);
      const artistRevenue = artistOrders.reduce((sum, o) => sum + o.finalAmount, 0);
      console.log(`  ${artist.user.name}: ${artistOrders.length} 筆訂單, 營收 NT$ ${artistRevenue.toLocaleString()}`);
    }

    console.log('');
    console.log('✅ 業務資料生成完成！');

  } catch (error) {
    console.error('❌ 生成業務資料失敗:', error);
    throw error;
  }
}

// 輔助函數
function generateContactMessage(): string {
  const messages = [
    '想要預約刺青，請問什麼時候有空檔？',
    '對手臂刺青有興趣，想了解價格和設計',
    '朋友推薦來這裡，想預約諮詢',
    '想要做一個紀念性的刺青，需要專業建議',
    '之前在其他地方做過，想找更好的師傅',
    '想要修改現有的刺青，請問可以嗎？',
    '對日式傳統刺青風格有興趣',
    '想要做情侶刺青，需要預約',
    '第一次刺青，有點緊張，想先諮詢',
    '想要做一個大型背部刺青，需要討論設計'
  ];
  return faker.helpers.arrayElement(messages);
}

function generateAppointmentNotes(): string {
  const notes = [
    '客戶偏好黑色系設計',
    '需要討論設計細節',
    '客戶是第一次刺青',
    '需要確認時間和地點',
    '客戶對疼痛比較敏感',
    '需要準備設計稿',
    '客戶要求特定風格',
    '需要確認價格和付款方式',
    '客戶時間比較彈性',
    '需要後續保養說明'
  ];
  return faker.helpers.arrayElement(notes);
}

function generateOrderNotes(): string {
  const notes = [
    '客戶滿意服務品質',
    '需要後續保養指導',
    '客戶推薦朋友來',
    '設計比預期更好',
    '服務過程順利',
    '客戶對價格滿意',
    '需要後續追蹤',
    '客戶要求發票',
    '服務超出預期',
    '客戶表示會再來'
  ];
  return faker.helpers.arrayElement(notes);
}

// 主執行函數
async function main() {
  const config: BusinessDataConfig = {
    contactsCount: 50,    // 50筆聯絡記錄
    appointmentsCount: 35, // 35筆預約記錄
    ordersCount: 25,      // 25筆訂單記錄
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31')
    }
  };

  try {
    await generateBusinessData(config);
  } catch (error) {
    console.error('執行失敗:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

export { generateBusinessData, BusinessDataConfig };
