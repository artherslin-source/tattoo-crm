import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('❌ 請輸入 email 與新密碼，例如:');
    console.error('npx ts-node scripts/reset-password.ts admin@test.com NewPassword123');
    process.exit(1);
  }

  const [email, newPassword] = args;

  // 驗證密碼長度
  if (newPassword.length < 8) {
    console.error('❌ 密碼長度至少需要 8 個字符');
    process.exit(1);
  }

  try {
    // 檢查用戶是否存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!existingUser) {
      console.error(`❌ 找不到 email 為 ${email} 的用戶`);
      process.exit(1);
    }

    console.log(`🔍 找到用戶: ${existingUser.name || existingUser.email} (${existingUser.role})`);

    // 產生新的 hash
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 更新資料庫
    const user = await prisma.user.update({
      where: { email },
      data: { hashedPassword },
      select: { id: true, email: true, name: true, role: true }
    });

    console.log(`✅ 使用者 ${user.email} 密碼已更新成功！`);
    console.log(`📝 新密碼: ${newPassword}`);
    console.log(`🔐 請妥善保管新密碼，並提醒用戶及時登入修改`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ 更新密碼失敗：', error.message);
    } else {
      console.error('❌ 更新密碼失敗：', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
