import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  開始清理數據庫...');

  try {
    // 清理所有數據（按外鍵約束順序）
    console.log('清理 Installment...');
    await prisma.installment.deleteMany();
    
    console.log('清理 Order...');
    await prisma.order.deleteMany();
    
    console.log('清理 CompletedService...');
    await prisma.completedService.deleteMany();
    
    console.log('清理 Appointment...');
    await prisma.appointment.deleteMany();
    
    console.log('清理 Contact...');
    await prisma.contact.deleteMany();
    
    console.log('清理 TopupHistory...');
    await prisma.topupHistory.deleteMany();
    
    console.log('清理 ArtistAvailability...');
    await prisma.artistAvailability.deleteMany();
    
    console.log('清理 Artist...');
    await prisma.artist.deleteMany();
    
    console.log('清理 Member...');
    await prisma.member.deleteMany();
    
    console.log('清理 ServiceHistory...');
    await prisma.serviceHistory.deleteMany();
    
    console.log('清理 Service...');
    await prisma.service.deleteMany();
    
    console.log('清理 User...');
    await prisma.user.deleteMany();
    
    console.log('清理 Branch...');
    await prisma.branch.deleteMany();
    
    console.log('✅ 數據庫清理完成！');
    
    // 檢查剩餘數據
    const branchCount = await prisma.branch.count();
    const userCount = await prisma.user.count();
    const memberCount = await prisma.member.count();
    const artistCount = await prisma.artist.count();
    const serviceCount = await prisma.service.count();
    const appointmentCount = await prisma.appointment.count();
    const orderCount = await prisma.order.count();
    
    console.log('\n📊 數據庫狀態：');
    console.log(`   - 分店: ${branchCount} 個`);
    console.log(`   - 用戶: ${userCount} 個`);
    console.log(`   - 會員: ${memberCount} 個`);
    console.log(`   - 刺青師: ${artistCount} 個`);
    console.log(`   - 服務: ${serviceCount} 個`);
    console.log(`   - 預約: ${appointmentCount} 個`);
    console.log(`   - 訂單: ${orderCount} 個`);
    
  } catch (error) {
    console.error('❌ 清理失敗:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

