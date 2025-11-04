-- =========================================
-- 添加新刺青師：陳翔男、朱川進（東港店、三重店）
-- 執行方式：在 Railway Dashboard → Postgres → Data → Query 中執行
-- =========================================

-- 1. 添加陳翔男（東港店）
WITH donggang AS (SELECT id FROM "Branch" WHERE name = '東港店' LIMIT 1)
INSERT INTO "User" (id, email, "hashedPassword", name, role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'chenxiangnan_user_' || gen_random_uuid()::text,
  'chen-xiangnan@tattoo.local',
  '$2a$10$temp_password_hash_for_testing_only',
  '陳翔男',
  'ARTIST',
  (SELECT id FROM donggang),
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'chen-xiangnan@tattoo.local')
RETURNING id;

WITH new_user AS (
  SELECT id FROM "User" WHERE email = 'chen-xiangnan@tattoo.local'
),
donggang AS (SELECT id FROM "Branch" WHERE name = '東港店' LIMIT 1)
INSERT INTO "Artist" (id, "userId", "displayName", bio, styles, speciality, "photoUrl", "branchId", active, "createdAt", "updatedAt")
SELECT 
  'chenxiangnan_artist_' || gen_random_uuid()::text,
  (SELECT id FROM new_user),
  '陳翔男',
  '專精日式與傳統風格，擁有豐富經驗，擅長各種傳統圖案設計。',
  '["Traditional", "Japanese"]'::jsonb,
  '日式與傳統風格',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
  (SELECT id FROM donggang),
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Artist" WHERE "userId" = (SELECT id FROM new_user));

-- 2. 添加朱川進（東港店）
WITH donggang AS (SELECT id FROM "Branch" WHERE name = '東港店' LIMIT 1)
INSERT INTO "User" (id, email, "hashedPassword", name, role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'zhuchuanjin_dg_user_' || gen_random_uuid()::text,
  'zhu-chuanjin-donggang@tattoo.local',
  '$2a$10$temp_password_hash_for_testing_only',
  '朱川進',
  'ARTIST',
  (SELECT id FROM donggang),
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'zhu-chuanjin-donggang@tattoo.local')
RETURNING id;

WITH new_user AS (
  SELECT id FROM "User" WHERE email = 'zhu-chuanjin-donggang@tattoo.local'
),
donggang AS (SELECT id FROM "Branch" WHERE name = '東港店' LIMIT 1)
INSERT INTO "Artist" (id, "userId", "displayName", bio, styles, speciality, "photoUrl", "branchId", active, "createdAt", "updatedAt")
SELECT 
  'zhuchuanjin_dg_artist_' || gen_random_uuid()::text,
  (SELECT id FROM new_user),
  '朱川進',
  '專精寫實與線條，擅長創意設計，在東港店服務。',
  '["Realistic", "Linework"]'::jsonb,
  '寫實與線條',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  (SELECT id FROM donggang),
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Artist" WHERE "userId" = (SELECT id FROM new_user));

-- 3. 添加朱川進（三重店）
WITH sanchong AS (SELECT id FROM "Branch" WHERE name = '三重店' LIMIT 1)
INSERT INTO "User" (id, email, "hashedPassword", name, role, "branchId", "isActive", "createdAt", "updatedAt")
SELECT 
  'zhuchuanjin_sc_user_' || gen_random_uuid()::text,
  'zhu-chuanjin-sanchong@tattoo.local',
  '$2a$10$temp_password_hash_for_testing_only',
  '朱川進',
  'ARTIST',
  (SELECT id FROM sanchong),
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'zhu-chuanjin-sanchong@tattoo.local')
RETURNING id;

WITH new_user AS (
  SELECT id FROM "User" WHERE email = 'zhu-chuanjin-sanchong@tattoo.local'
),
sanchong AS (SELECT id FROM "Branch" WHERE name = '三重店' LIMIT 1)
INSERT INTO "Artist" (id, "userId", "displayName", bio, styles, speciality, "photoUrl", "branchId", active, "createdAt", "updatedAt")
SELECT 
  'zhuchuanjin_sc_artist_' || gen_random_uuid()::text,
  (SELECT id FROM new_user),
  '朱川進',
  '專精寫實與線條，擅長創意設計，在三重店服務。',
  '["Realistic", "Linework"]'::jsonb,
  '寫實與線條',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  (SELECT id FROM sanchong),
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Artist" WHERE "userId" = (SELECT id FROM new_user));

-- 4. 驗證結果
SELECT 
  COUNT(*) as total_artists,
  '應該顯示 6 個刺青師' as note
FROM "Artist";

SELECT 
  a."displayName" as artist_name,
  b.name as branch_name,
  u.name as user_name,
  u.email as user_email
FROM "Artist" a
JOIN "Branch" b ON a."branchId" = b.id
JOIN "User" u ON a."userId" = u.id
ORDER BY a."createdAt" DESC;

