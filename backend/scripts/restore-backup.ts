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

// 列出所有備份文件
function listBackups() {
  const backupDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    log('yellow', '\n⚠️  沒有找到備份目錄');
    return [];
  }
  
  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .reverse(); // 最新的在前
  
  return files.map(file => path.join(backupDir, file));
}

// 顯示備份資訊
function displayBackupInfo(backupFile: string) {
  try {
    const content = fs.readFileSync(backupFile, 'utf-8');
    const backup = JSON.parse(content);
    
    log('cyan', '\n📊 備份資訊:');
    log('blue', `   時間: ${backup.timestamp}`);
    log('blue', `   原因: ${backup.reason}`);
    log('blue', `   環境: ${backup.environment?.nodeEnv || 'unknown'}`);
    log('blue', `   資料庫: ${backup.environment?.databaseType || 'unknown'}`);
    
    log('cyan', '\n📦 包含的數據:');
    log('blue', `   - ${backup.data.branches?.length || 0} 個分店`);
    log('blue', `   - ${backup.data.artists?.length || 0} 個刺青師`);
    log('blue', `   - ${backup.data.services?.length || 0} 個服務項目`);
    
    if (backup.counts) {
      log('cyan', '\n📈 原始數據量:');
      log('blue', `   - ${backup.counts.users} 個用戶`);
      log('blue', `   - ${backup.counts.members} 個會員`);
      log('blue', `   - ${backup.counts.appointments} 個預約`);
      log('blue', `   - ${backup.counts.orders} 個訂單`);
    }
    
    return backup;
  } catch (error) {
    log('red', `❌ 讀取備份文件失敗: ${error}`);
    return null;
  }
}

// 恢復數據
async function restoreBackup(backupFile: string, options: { autoConfirm?: boolean }) {
  log('magenta', '\n🔄 數據恢復系統');
  log('magenta', '='.repeat(50));
  
  // 檢查文件是否存在
  if (!fs.existsSync(backupFile)) {
    log('red', `\n❌ 備份文件不存在: ${backupFile}`);
    process.exit(1);
  }
  
  // 顯示備份資訊
  const backup = displayBackupInfo(backupFile);
  
  if (!backup) {
    process.exit(1);
  }
  
  // 警告
  log('yellow', '\n⚠️  警告: 恢復操作會覆蓋以下現有數據:');
  log('yellow', '   - 分店資料');
  log('yellow', '   - 刺青師資料');
  log('yellow', '   - 服務項目');
  log('yellow', '   （不會影響用戶、會員、預約、訂單）');
  
  // 用戶確認
  if (!options.autoConfirm) {
    log('yellow', '\n❓ 確認恢復此備份？');
    const confirmed = await askConfirmation('請確認');
    
    if (!confirmed) {
      log('yellow', '\n⏹️  操作已取消');
      process.exit(0);
    }
  }
  
  // 執行恢復
  log('cyan', '\n🔄 開始恢復數據...');
  
  try {
    let restoredCount = {
      branches: 0,
      artists: 0,
      services: 0,
    };
    
    // 恢復分店
    if (backup.data.branches && backup.data.branches.length > 0) {
      log('blue', '\n📍 恢復分店資料...');
      for (const branch of backup.data.branches) {
        try {
          await prisma.branch.upsert({
            where: { id: branch.id },
            update: {
              name: branch.name,
              address: branch.address,
            },
            create: {
              id: branch.id,
              name: branch.name,
              address: branch.address,
            },
          });
          restoredCount.branches++;
        } catch (error) {
          log('yellow', `   ⚠️  跳過分店 ${branch.name}: ${error}`);
        }
      }
      log('green', `   ✅ 恢復 ${restoredCount.branches} 個分店`);
    }
    
    // 恢復刺青師
    if (backup.data.artists && backup.data.artists.length > 0) {
      log('blue', '\n🎨 恢復刺青師資料...');
      for (const artist of backup.data.artists) {
        try {
          // 先檢查用戶是否存在
          const user = await prisma.user.findUnique({
            where: { email: artist.user.email },
          });
          
          if (user) {
            await prisma.artist.upsert({
              where: { id: artist.id },
              update: {
                displayName: artist.displayName,
                speciality: artist.speciality,
                portfolioUrl: artist.portfolioUrl,
                branchId: artist.branchId,
                active: artist.active,
              },
              create: {
                id: artist.id,
                userId: user.id,
                displayName: artist.displayName,
                speciality: artist.speciality,
                portfolioUrl: artist.portfolioUrl,
                branchId: artist.branchId,
                active: artist.active,
              },
            });
            restoredCount.artists++;
          } else {
            log('yellow', `   ⚠️  跳過刺青師 ${artist.displayName}: 用戶不存在`);
          }
        } catch (error) {
          log('yellow', `   ⚠️  跳過刺青師 ${artist.displayName}: ${error}`);
        }
      }
      log('green', `   ✅ 恢復 ${restoredCount.artists} 個刺青師`);
    }
    
    // 恢復服務項目
    if (backup.data.services && backup.data.services.length > 0) {
      log('blue', '\n🛠️  恢復服務項目...');
      for (const service of backup.data.services) {
        try {
          await prisma.service.upsert({
            where: { id: service.id },
            update: {
              name: service.name,
              description: service.description,
              price: service.price,
              durationMin: service.durationMin,
              isActive: service.isActive,
            },
            create: {
              id: service.id,
              name: service.name,
              description: service.description,
              price: service.price,
              durationMin: service.durationMin,
              isActive: service.isActive,
            },
          });
          restoredCount.services++;
        } catch (error) {
          log('yellow', `   ⚠️  跳過服務 ${service.name}: ${error}`);
        }
      }
      log('green', `   ✅ 恢復 ${restoredCount.services} 個服務項目`);
    }
    
    log('green', '\n✅ 數據恢復完成！');
    log('cyan', '\n📊 恢復統計:');
    log('blue', `   - ${restoredCount.branches} 個分店`);
    log('blue', `   - ${restoredCount.artists} 個刺青師`);
    log('blue', `   - ${restoredCount.services} 個服務項目`);
    
  } catch (error) {
    log('red', '\n❌ 數據恢復失敗！');
    log('red', `   錯誤: ${error}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// CLI 介面
async function main() {
  const args = process.argv.slice(2);
  
  // 如果沒有參數，列出所有備份
  if (args.length === 0 || args[0] === '--list' || args[0] === '-l') {
    log('cyan', '\n📦 可用的備份文件:');
    const backups = listBackups();
    
    if (backups.length === 0) {
      log('yellow', '   沒有找到備份文件');
      process.exit(0);
    }
    
    backups.forEach((file, index) => {
      const filename = path.basename(file);
      log('blue', `   ${index + 1}. ${filename}`);
    });
    
    log('cyan', '\n使用方式:');
    log('blue', '   npm run restore -- <backup-file.json>');
    log('blue', '   npm run restore -- --latest  (恢復最新的備份)');
    
    process.exit(0);
  }
  
  // 解析參數
  let backupFile: string;
  let autoConfirm = false;
  
  if (args[0] === '--latest') {
    const backups = listBackups();
    if (backups.length === 0) {
      log('red', '❌ 沒有找到備份文件');
      process.exit(1);
    }
    backupFile = backups[0];
    log('cyan', `\n📦 使用最新的備份: ${path.basename(backupFile)}`);
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
🔄 數據恢復系統

使用方式:
  npm run restore [options] [backup-file]

選項:
  -l, --list               列出所有備份文件
  --latest                 恢復最新的備份
  -y, --yes                自動確認，不詢問
  -h, --help               顯示此說明

範例:
  # 列出備份
  npm run restore --list
  
  # 恢復特定備份
  npm run restore -- backup_2025-01-15.json
  
  # 恢復最新備份
  npm run restore -- --latest
  
  # 自動確認
  npm run restore -- --latest -y

注意:
  - 恢復操作會覆蓋現有的分店、刺青師、服務項目
  - 不會影響用戶、會員、預約、訂單數據
  - 備份文件保存在 backend/backups/ 目錄
    `);
    process.exit(0);
  } else {
    backupFile = args[0];
    
    // 如果只提供文件名，加上完整路徑
    if (!path.isAbsolute(backupFile) && !backupFile.includes('/')) {
      backupFile = path.join(__dirname, '..', 'backups', backupFile);
    }
  }
  
  // 檢查 -y 參數
  if (args.includes('-y') || args.includes('--yes')) {
    autoConfirm = true;
  }
  
  // 執行恢復
  await restoreBackup(backupFile, { autoConfirm });
}

// 執行
main().catch((error) => {
  log('red', `\n❌ 執行失敗: ${error}`);
  process.exit(1);
});

