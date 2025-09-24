const bcrypt = require('bcrypt');

async function testBcrypt() {
  try {
    console.log('Testing bcrypt...');
    
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('Hashed password:', hashedPassword);
    
    const isValid = await bcrypt.compare(password, hashedPassword);
    console.log('Password validation:', isValid);
    
    // 測試與數據庫中的密碼比較
    const dbPassword = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J8K8K8K8K'; // 這是一個示例哈希
    const isValidDb = await bcrypt.compare(password, dbPassword);
    console.log('Database password validation:', isValidDb);
    
  } catch (error) {
    console.error('Bcrypt error:', error);
  }
}

testBcrypt();
