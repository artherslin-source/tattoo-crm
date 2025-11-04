const { Client } = require('pg');

async function addArtists() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ 已連接到資料庫');

    // 獲取分店 ID
    const branchResult = await client.query('SELECT id, name FROM "Branch"');
    console.log('分店列表:', branchResult.rows);

    const donggang = branchResult.rows.find(b => b.name === '東港店');
    const sanchong = branchResult.rows.find(b => b.name === '三重店');

    if (!donggang || !sanchong) {
      throw new Error('找不到分店');
    }

    // 添加陳翔男（東港店）
    const chenxiangnanUser = await client.query(`
      INSERT INTO "User" (id, email, "hashedPassword", name, role, "branchId", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, [
      'cmhdt08nv001qmi76fw3k9gg6',
      'chen-xiangnan@tattoo.local',
      'temp_password_12345678',
      '陳翔男',
      'ARTIST',
      donggang.id,
      true
    ]);

    const chenxiangnanArtist = await client.query(`
      INSERT INTO "Artist" (id, "userId", "displayName", bio, styles, speciality, "photoUrl", "branchId", active, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `, [
      'cmhdt08nv001qmi76fw3k9gg7',
      'cmhdt08nv001qmi76fw3k9gg6',
      '陳翔男',
      '專精日式與傳統風格，擁有豐富經驗，擅長各種傳統圖案設計。',
      '["Traditional", "Japanese"]',
      '日式與傳統風格',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
      donggang.id,
      true
    ]);

    console.log('✅ 陳翔男添加成功');

    // 添加朱川進（東港店）
    const zhuchuanjinUser1 = await client.query(`
      INSERT INTO "User" (id, email, "hashedPassword", name, role, "branchId", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, [
      'cmhdt08nv001qmi76fw3k9gg8',
      'zhu-chuanjin-donggang@tattoo.local',
      'temp_password_12345678',
      '朱川進',
      'ARTIST',
      donggang.id,
      true
    ]);

    const zhuchuanjinArtist1 = await client.query(`
      INSERT INTO "Artist" (id, "userId", "displayName", bio, styles, speciality, "photoUrl", "branchId", active, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `, [
      'cmhdt08nv001qmi76fw3k9gg9',
      'cmhdt08nv001qmi76fw3k9gg8',
      '朱川進',
      '專精寫實與線條，擅長創意設計，在東港店服務。',
      '["Realistic", "Linework"]',
      '寫實與線條',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
      donggang.id,
      true
    ]);

    console.log('✅ 朱川進（東港店）添加成功');

    // 添加朱川進（三重店）
    const zhuchuanjinUser2 = await client.query(`
      INSERT INTO "User" (id, email, "hashedPassword", name, role, "branchId", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, [
      'cmhdt08nv001qmi76fw3k9gga',
      'zhu-chuanjin-sanchong@tattoo.local',
      'temp_password_12345678',
      '朱川進',
      'ARTIST',
      sanchong.id,
      true
    ]);

    const zhuchuanjinArtist2 = await client.query(`
      INSERT INTO "Artist" (id, "userId", "displayName", bio, styles, speciality, "photoUrl", "branchId", active, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `, [
      'cmhdt08nv001qmi76fw3k9ggb',
      'cmhdt08nv001qmi76fw3k9gga',
      '朱川進',
      '專精寫實與線條，擅長創意設計，在三重店服務。',
      '["Realistic", "Linework"]',
      '寫實與線條',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
      sanchong.id,
      true
    ]);

    console.log('✅ 朱川進（三重店）添加成功');

    // 檢查總數
    const countResult = await client.query('SELECT COUNT(*) as total FROM "Artist"');
    console.log('🎉 總刺青師數量:', countResult.rows[0].total);

    // 顯示所有刺青師
    const artistsResult = await client.query(`
      SELECT a."displayName", b.name as branch_name 
      FROM "Artist" a 
      JOIN "Branch" b ON a."branchId" = b.id 
      ORDER BY a."createdAt"
    `);
    console.log('刺青師列表:', artistsResult.rows);

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await client.end();
  }
}

addArtists();


