const bcrypt = require('bcrypt');

async function fixProduction() {
  try {
    console.log('🔧 開始修復生產環境...');
    
    // 1. 重置 admin 密碼
    const hashedPassword = await bcrypt.hash('12345678', 10);
    console.log('✅ Admin 密碼已重置:', hashedPassword);
    
    // 2. 添加新刺青師的 SQL 語句
    const addArtistsSQL = `
      -- 添加陳翔男
      INSERT INTO "User" (id, email, "hashedPassword", name, phone, role, "branchId", "isActive", "createdAt", "updatedAt")
      VALUES ('artist_chen_xiangnan', 'chenxiangnan@test.com', '${hashedPassword}', '陳翔男', '0912345678', 'ARTIST', 'branch-donggang', true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET 
        "hashedPassword" = EXCLUDED."hashedPassword",
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        "branchId" = EXCLUDED."branchId",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = NOW();

      INSERT INTO "Artist" (id, "userId", "displayName", specialties, experience, "branchId", "isActive", "createdAt", "updatedAt")
      VALUES ('artist_chen_xiangnan_profile', 'artist_chen_xiangnan', '陳翔男', '["日式與傳統風格"]', '8年', 'branch-donggang', true, NOW(), NOW())
      ON CONFLICT ("userId") DO UPDATE SET 
        "displayName" = EXCLUDED."displayName",
        specialties = EXCLUDED.specialties,
        experience = EXCLUDED.experience,
        "branchId" = EXCLUDED."branchId",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = NOW();

      -- 添加朱川進（東港店）
      INSERT INTO "User" (id, email, "hashedPassword", name, phone, role, "branchId", "isActive", "createdAt", "updatedAt")
      VALUES ('artist_zhu_chuanjin_donggang', 'zhuchuanjin_donggang@test.com', '${hashedPassword}', '朱川進', '0912345679', 'ARTIST', 'branch-donggang', true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET 
        "hashedPassword" = EXCLUDED."hashedPassword",
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        "branchId" = EXCLUDED."branchId",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = NOW();

      INSERT INTO "Artist" (id, "userId", "displayName", specialties, experience, "branchId", "isActive", "createdAt", "updatedAt")
      VALUES ('artist_zhu_chuanjin_donggang_profile', 'artist_zhu_chuanjin_donggang', '朱川進', '["寫實與線條"]', '10年', 'branch-donggang', true, NOW(), NOW())
      ON CONFLICT ("userId") DO UPDATE SET 
        "displayName" = EXCLUDED."displayName",
        specialties = EXCLUDED.specialties,
        experience = EXCLUDED.experience,
        "branchId" = EXCLUDED."branchId",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = NOW();

      -- 添加朱川進（三重店）
      INSERT INTO "User" (id, email, "hashedPassword", name, phone, role, "branchId", "isActive", "createdAt", "updatedAt")
      VALUES ('artist_zhu_chuanjin_sanchong', 'zhuchuanjin_sanchong@test.com', '${hashedPassword}', '朱川進', '0912345680', 'ARTIST', 'branch-sanchong', true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET 
        "hashedPassword" = EXCLUDED."hashedPassword",
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        "branchId" = EXCLUDED."branchId",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = NOW();

      INSERT INTO "Artist" (id, "userId", "displayName", specialties, experience, "branchId", "isActive", "createdAt", "updatedAt")
      VALUES ('artist_zhu_chuanjin_sanchong_profile', 'artist_zhu_chuanjin_sanchong', '朱川進', '["寫實與線條"]', '10年', 'branch-sanchong', true, NOW(), NOW())
      ON CONFLICT ("userId") DO UPDATE SET 
        "displayName" = EXCLUDED."displayName",
        specialties = EXCLUDED.specialties,
        experience = EXCLUDED.experience,
        "branchId" = EXCLUDED."branchId",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = NOW();

      -- 重置 admin 密碼
      UPDATE "User" SET "hashedPassword" = '${hashedPassword}' WHERE email = 'admin@test.com';
    `;
    
    console.log('📝 SQL 語句已準備完成');
    console.log('請在 Railway PostgreSQL Shell 中執行以下 SQL：');
    console.log('---');
    console.log(addArtistsSQL);
    console.log('---');
    
  } catch (error) {
    console.error('❌ 修復失敗:', error);
  }
}

fixProduction();


