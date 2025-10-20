#!/usr/bin/env node

/**
 * 業務資料生成執行腳本
 * 
 * 使用方式：
 * node scripts/run-business-data.js [選項]
 * 
 * 選項：
 * --contacts=數量    聯絡記錄數量 (預設: 50)
 * --appointments=數量 預約記錄數量 (預設: 35)
 * --orders=數量      訂單記錄數量 (預設: 25)
 * --year=年份        資料年份 (預設: 2024)
 * --help            顯示幫助
 */

const { execSync } = require('child_process');
const path = require('path');

// 解析命令列參數
const args = process.argv.slice(2);
const options = {
  contacts: 50,
  appointments: 35,
  orders: 25,
  year: 2024,
  help: false
};

args.forEach(arg => {
  if (arg === '--help') {
    options.help = true;
  } else if (arg.startsWith('--contacts=')) {
    options.contacts = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--appointments=')) {
    options.appointments = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--orders=')) {
    options.orders = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--year=')) {
    options.year = parseInt(arg.split('=')[1]);
  }
});

if (options.help) {
  console.log(`
🏢 業務資料生成工具

使用方式：
  node scripts/run-business-data.js [選項]

選項：
  --contacts=數量     聯絡記錄數量 (預設: 50)
  --appointments=數量 預約記錄數量 (預設: 35)
  --orders=數量       訂單記錄數量 (預設: 25)
  --year=年份         資料年份 (預設: 2024)
  --help             顯示此幫助

範例：
  node scripts/run-business-data.js
  node scripts/run-business-data.js --contacts=100 --appointments=80 --orders=60
  node scripts/run-business-data.js --year=2023

業務流程：
  📞 聯絡記錄 → 📅 預約記錄 → 💰 訂單記錄
  `);
  process.exit(0);
}

console.log('🏢 業務資料生成工具');
console.log('==================');
console.log(`📞 聯絡記錄: ${options.contacts} 筆`);
console.log(`📅 預約記錄: ${options.appointments} 筆`);
console.log(`💰 訂單記錄: ${options.orders} 筆`);
console.log(`📅 資料年份: ${options.year}`);
console.log('');

// 設置環境變數
process.env.CONTACTS_COUNT = options.contacts.toString();
process.env.APPOINTMENTS_COUNT = options.appointments.toString();
process.env.ORDERS_COUNT = options.orders.toString();
process.env.DATA_YEAR = options.year.toString();

try {
  // 執行 TypeScript 腳本
  const scriptPath = path.join(__dirname, 'generate-business-data.ts');
  execSync(`npx ts-node "${scriptPath}"`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('');
  console.log('🎉 業務資料生成完成！');
  console.log('💡 提示：您可以在管理後台查看生成的資料');
  
} catch (error) {
  console.error('❌ 執行失敗:', error.message);
  process.exit(1);
}
