import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 把所有沒有 name 的使用者補上預設值
  await prisma.user.updateMany({
    where: { name: null },
    data: { name: "未命名使用者" }
  })
  console.log("✅ 已修復缺失的使用者 name 欄位")
}

main().finally(() => prisma.$disconnect())
