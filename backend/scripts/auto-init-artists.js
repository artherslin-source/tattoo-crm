// 自動初始化腳本：在後端啟動時檢查並添加缺失的刺青師
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function autoInitArtists() {
  try {
    console.log('🔍 檢查是否需要添加新刺青師...');
    
    // 檢查是否已有新刺青師
    const existingEmails = ['chen-xiangnan@tattoo.local', 'zhu-chuanjin-donggang@tattoo.local', 'zhu-chuanjin-sanchong@tattoo.local'];
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: existingEmails } },
      include: { Artist: true }
    });
    
    const existingEmailsSet = new Set(existingUsers.map(u => u.email));
    const missingEmails = existingEmails.filter(email => !existingEmailsSet.has(email));
    
    if (missingEmails.length === 0) {
      console.log('✅ 所有新刺青師已存在，跳過初始化');
      return;
    }
    
    console.log(`📝 發現缺失的刺青師，執行添加腳本...`);
    
    // 執行添加腳本
    const { execSync } = require('child_process');
    try {
      execSync('npm run add:artists', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ 新刺青師添加完成');
    } catch (error) {
      console.warn('⚠️ 自動添加腳本執行失敗，但不影響服務啟動:', error.message);
    }
    
  } catch (error) {
    console.warn('⚠️ 自動初始化刺青師時發生錯誤，但不影響服務啟動:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 只有在非測試環境才執行
if (process.env.NODE_ENV !== 'test' && !process.env.SKIP_AUTO_INIT) {
  autoInitArtists().catch(() => {
    // 忽略錯誤，不影響服務啟動
  });
}

module.exports = { autoInitArtists };

