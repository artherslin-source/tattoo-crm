-- 添加陳翔男（東港店）
INSERT INTO "User" (id, email, "hashedPassword", name, role, "branchId", "isActive", "createdAt", "updatedAt")
VALUES (
  'cmhdt08nv001qmi76fw3k9gg6',
  'chen-xiangnan@tattoo.local',
  'temp_password_12345678',
  '陳翔男',
  'ARTIST',
  (SELECT id FROM "Branch" WHERE name = '東港店' LIMIT 1),
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO "Artist" (id, "userId", "displayName", bio, styles, speciality, "photoUrl", "branchId", active, "createdAt", "updatedAt")
VALUES (
  'cmhdt08nv001qmi76fw3k9gg7',
  'cmhdt08nv001qmi76fw3k9gg6',
  '陳翔男',
  '專精日式與傳統風格，擁有豐富經驗，擅長各種傳統圖案設計。',
  '["Traditional", "Japanese"]',
  '日式與傳統風格',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
  (SELECT id FROM "Branch" WHERE name = '東港店' LIMIT 1),
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 添加朱川進（東港店）
INSERT INTO "User" (id, email, "hashedPassword", name, role, "branchId", "isActive", "createdAt", "updatedAt")
VALUES (
  'cmhdt08nv001qmi76fw3k9gg8',
  'zhu-chuanjin-donggang@tattoo.local',
  'temp_password_12345678',
  '朱川進',
  'ARTIST',
  (SELECT id FROM "Branch" WHERE name = '東港店' LIMIT 1),
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO "Artist" (id, "userId", "displayName", bio, styles, speciality, "photoUrl", "branchId", active, "createdAt", "updatedAt")
VALUES (
  'cmhdt08nv001qmi76fw3k9gg9',
  'cmhdt08nv001qmi76fw3k9gg8',
  '朱川進',
  '專精寫實與線條，擅長創意設計，在東港店服務。',
  '["Realistic", "Linework"]',
  '寫實與線條',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  (SELECT id FROM "Branch" WHERE name = '東港店' LIMIT 1),
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 添加朱川進（三重店）
INSERT INTO "User" (id, email, "hashedPassword", name, role, "branchId", "isActive", "createdAt", "updatedAt")
VALUES (
  'cmhdt08nv001qmi76fw3k9gga',
  'zhu-chuanjin-sanchong@tattoo.local',
  'temp_password_12345678',
  '朱川進',
  'ARTIST',
  (SELECT id FROM "Branch" WHERE name = '三重店' LIMIT 1),
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO "Artist" (id, "userId", "displayName", bio, styles, speciality, "photoUrl", "branchId", active, "createdAt", "updatedAt")
VALUES (
  'cmhdt08nv001qmi76fw3k9ggb',
  'cmhdt08nv001qmi76fw3k9gga',
  '朱川進',
  '專精寫實與線條，擅長創意設計，在三重店服務。',
  '["Realistic", "Linework"]',
  '寫實與線條',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  (SELECT id FROM "Branch" WHERE name = '三重店' LIMIT 1),
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 檢查結果
SELECT COUNT(*) as total_artists FROM "Artist";
SELECT a."displayName", b.name as branch_name FROM "Artist" a JOIN "Branch" b ON a."branchId" = b.id ORDER BY a."createdAt";


