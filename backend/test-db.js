const { PrismaClient } = require('@prisma/client');

async function testDb() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    
    // 測試查詢用戶
    const users = await prisma.user.findMany({
      take: 5,
      include: { branch: true }
    });
    
    console.log('Users found:', users.length);
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}, Branch: ${user.branch?.name || 'None'}`);
    });
    
    // 測試查詢分店
    const branches = await prisma.branch.findMany();
    console.log('\nBranches found:', branches.length);
    branches.forEach(branch => {
      console.log(`- ${branch.name} (${branch.address})`);
    });
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDb();
