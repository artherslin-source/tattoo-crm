#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const prisma = new PrismaClient();

// 顏色代碼
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 環境檢測
function detectEnvironment() {
  const nodeEnv = process.env.NODE_ENV;
  const databaseUrl = process.env.DATABASE_URL || '';
  
  const isProduction = 
    nodeEnv === 'production' || 
    databaseUrl.includes('railway') ||
    databaseUrl.includes('prod');
  
  const isStaging = 
    nodeEnv === 'staging' ||
    databaseUrl.includes('staging');
  
  const isDevelopment = !isProduction && !isStaging;
  
  return {
    isProduction,
    isStaging,
    isDevelopment,
    nodeEnv: nodeEnv || 'unknown',
    databaseType: databaseUrl.startsWith('postgres') ? 'PostgreSQL' : 
                  databaseUrl.startsWith('sqlite') ? 'SQLite' : 'Unknown'
  };
}

// 備份數據
async function backupData(reason: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  
  // 確保備份目錄存在
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupFile = path.join(backupDir, `backup_${timestamp}.json`);
  
  log('cyan', '\n💾 開始備份重要數據...');
  
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      reason,
      environment: detectEnvironment(),
      data: {
        branches: await prisma.branch.findMany(),
        artists: await prisma.artist.findMany({
          include: {
            user: {
              select: {
                email: true,
                name: true,
                phone: true,
                role: true,
              }
            }
          }
        }),
        services: await prisma.service.findMany(),
      },
      counts: {
        users: await prisma.user.count(),
        members: await prisma.member.count(),
        appointments: await prisma.appointment.count(),
        orders: await prisma.order.count(),
      }
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    log('green', `✅ 備份完成: ${backupFile}`);
    log('blue', `   - ${backup.data.branches.length} 個分店`);
    log('blue', `   - ${backup.data.artists.length} 個刺青師`);
    log('blue', `   - ${backup.data.services.length} 個服務項目`);
    log('blue', `   - ${backup.counts.users} 個用戶`);
    log('blue', `   - ${backup.counts.appointments} 個預約`);
    log('blue', `   - ${backup.counts.orders} 個訂單`);
    
    return backupFile;
  } catch (error) {
    log('red', `❌ 備份失敗: ${error}`);
    throw error;
  }
}

// 詢問用戶確認
function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// 主要重建邏輯
async function smartRebuild(options: {
  reason: string;
  protectRealData: boolean;
  skipBackup?: boolean;
  autoConfirm?: boolean;
}) {
  log('magenta', '\n🤖 智能數據重建系統');
  log('magenta', '='.repeat(50));
  
  const env = detectEnvironment();
  
  // 顯示環境資訊
  log('cyan', '\n📊 環境資訊:');
  log('blue', `   環境: ${env.isDevelopment ? '開發' : env.isStaging ? '測試' : '生產'}`);
  log('blue', `   NODE_ENV: ${env.nodeEnv}`);
  log('blue', `   資料庫: ${env.databaseType}`);
  
  // 顯示重建資訊
  log('cyan', '\n🔧 重建資訊:');
  log('blue', `   原因: ${options.reason}`);
  log('blue', `   保護業務數據: ${options.protectRealData ? '是' : '否'}`);
  
  // 生產環境安全檢查
  if (env.isProduction && !options.protectRealData) {
    log('red', '\n❌ 錯誤: 生產環境必須啟用數據保護！');
    log('yellow', '   無法在生產環境執行完全重建');
    log('yellow', '   這會刪除所有真實業務數據');
    log('green', '\n✅ 建議: 使用 --protect 參數來保護分店和刺青師數據');
    process.exit(1);
  }
  
  // 生產環境警告
  if (env.isProduction) {
    log('yellow', '\n⚠️  警告: 這是生產環境！');
    log('yellow', '   即使啟用了數據保護，以下數據仍會被刪除:');
    log('yellow', '   - 所有用戶帳號（包括管理員）');
    log('yellow', '   - 所有會員記錄');
    log('yellow', '   - 所有預約記錄');
    log('yellow', '   - 所有訂單記錄');
    log('green', '   保留的數據:');
    log('green', '   - 分店資料');
    log('green', '   - 刺青師資料');
  }
  
  // 用戶確認
  if (!options.autoConfirm) {
    log('yellow', '\n❓ 確認執行數據重建？');
    const confirmed = await askConfirmation('請確認');
    
    if (!confirmed) {
      log('yellow', '\n⏹️  操作已取消');
      process.exit(0);
    }
  }
  
  // 備份
  let backupFile: string | null = null;
  if (!options.skipBackup) {
    try {
      backupFile = await backupData(options.reason);
    } catch (error) {
      log('red', '\n❌ 備份失敗，是否繼續？');
      const continueAnyway = await askConfirmation('繼續執行（不建議）');
      
      if (!continueAnyway) {
        log('yellow', '\n⏹️  操作已取消');
        process.exit(0);
      }
    }
  }
  
  // 執行重建
  log('cyan', '\n🔄 開始執行數據重建...');
  
  try {
    // 設定環境變數
    process.env.PROTECT_REAL_DATA = options.protectRealData ? 'true' : 'false';
    
    // 執行 seed 腳本
    const { execSync } = require('child_process');
    execSync('npx ts-node prisma/seed.ts', { 
      stdio: 'inherit',
      env: process.env
    });
    
    log('green', '\n✅ 數據重建完成！');
    
    if (backupFile) {
      log('blue', `\n💾 備份文件: ${backupFile}`);
      log('blue', `   如需恢復，請執行: npm run restore -- ${path.basename(backupFile)}`);
    }
    
  } catch (error) {
    log('red', '\n❌ 數據重建失敗！');
    log('red', `   錯誤: ${error}`);
    
    if (backupFile) {
      log('yellow', `\n💾 備份文件已保存: ${backupFile}`);
      log('yellow', `   可以使用此文件恢復數據`);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// CLI 介面
async function main() {
  const args = process.argv.slice(2);
  
  // 解析參數
  const options = {
    reason: 'Manual rebuild',
    protectRealData: false,
    skipBackup: false,
    autoConfirm: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--reason':
      case '-r':
        options.reason = args[++i] || 'Manual rebuild';
        break;
      
      case '--protect':
      case '-p':
        options.protectRealData = true;
        break;
      
      case '--no-backup':
        options.skipBackup = true;
        break;
      
      case '--yes':
      case '-y':
        options.autoConfirm = true;
        break;
      
      case '--help':
      case '-h':
        console.log(`
🤖 智能數據重建系統

使用方式:
  npm run rebuild [options]

選項:
  -r, --reason <reason>    重建原因 (預設: "Manual rebuild")
  -p, --protect            保護分店和刺青師數據
  --no-backup              跳過自動備份 (不建議)
  -y, --yes                自動確認，不詢問 (危險)
  -h, --help               顯示此說明

範例:
  # 開發環境完全重建
  npm run rebuild -r "測試新功能"
  
  # 生產環境保護性重建
  npm run rebuild -p -r "清理測試數據"
  
  # 自動確認（CI/CD 使用）
  npm run rebuild -p -y

注意:
  - 生產環境必須使用 --protect 參數
  - 所有操作都會自動備份（除非使用 --no-backup）
  - 備份文件保存在 backend/backups/ 目錄
        `);
        process.exit(0);
    }
  }
  
  // 執行重建
  await smartRebuild(options);
}

// 執行
main().catch((error) => {
  log('red', `\n❌ 執行失敗: ${error}`);
  process.exit(1);
});

