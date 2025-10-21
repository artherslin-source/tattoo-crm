-- Railway 資料庫修復 SQL 腳本
-- 在 Railway Dashboard 的資料庫查詢中執行

-- 步驟 1: 添加 photoUrl 欄位到 TattooArtist 表
ALTER TABLE "TattooArtist" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;

-- 步驟 2: 檢查欄位是否添加成功
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'TattooArtist' 
AND column_name = 'photoUrl';

-- 步驟 3: 檢查現有的管理員帳號
SELECT id, email, name, role, "createdAt" 
FROM "User" 
WHERE role = 'BOSS' OR email = 'admin@test.com';

-- 步驟 4: 如果沒有管理員帳號，創建一個
-- 注意：這個需要手動執行，因為需要加密密碼
-- INSERT INTO "User" (id, email, name, password, role, "isActive", "createdAt", "updatedAt")
-- VALUES (
--   'admin-user-id',
--   'admin@test.com',
--   '管理員',
--   '$2b$10$encrypted_password_here', -- 需要實際的加密密碼
--   'BOSS',
--   true,
--   NOW(),
--   NOW()
-- );

-- 步驟 5: 檢查分店資料
SELECT id, name, address, "isActive" 
FROM "Branch" 
ORDER BY "createdAt";

-- 步驟 6: 檢查刺青師資料
SELECT id, "displayName", bio, "branchId", active 
FROM "TattooArtist" 
ORDER BY "createdAt";

-- 執行完成後，請重新部署後端服務
