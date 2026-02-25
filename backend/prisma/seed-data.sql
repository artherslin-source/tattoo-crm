-- 初始資料（與 Railway／Zeabur 上線說明一致）：分店、管理員、刺青師、基本服務
-- 使用方式：在執行 npx prisma migrate deploy 或 prisma db push 之後執行此檔
--   PostgreSQL: psql $DATABASE_URL -f prisma/seed-data.sql
--   或: npx prisma db execute --file prisma/seed-data.sql --schema prisma/schema.prisma
-- 帳號密碼皆為 12345678（上線後請於後台修改）
--
-- 與 seed.ts 的差異：
-- - 本檔（seed-data.sql）：固定 ID（seed-branch-1、seed-user-admin 等），用於生產／Zeabur／手動匯入，
--   內容與《系統安裝上線說明》一致：2 分店、1 管理員、2 分店經理、6 位刺青師、3 項基本服務。
-- - seed.ts：本機開發用；空 DB 時會建立「同一份名單」（相同 email/姓名/手機/專長），但 ID 為自動產生，
--   且會多建立會員、預約、帳單等示範資料。生產環境請以本 SQL 檔手動匯入，勿依賴 seed.ts。

-- Branch
INSERT INTO "Branch" ("id", "name", "address", "phone", "businessHours", "createdAt", "updatedAt") VALUES
('seed-branch-1', '三重店', '新北市三重區重新路一段123號', '02-2975-1234', '{"monday":"09:00-18:00","tuesday":"09:00-18:00","wednesday":"09:00-18:00","thursday":"09:00-18:00","friday":"09:00-18:00","saturday":"10:00-16:00","sunday":"closed"}'::jsonb, NOW(), NOW()),
('seed-branch-2', '東港店', '屏東縣東港鎮沿海路356號', '08-831-1615', '{"monday":"09:00-18:00","tuesday":"09:00-18:00","wednesday":"09:00-18:00","thursday":"09:00-18:00","friday":"09:00-18:00","saturday":"10:00-16:00","sunday":"closed"}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- User: 1 BOSS + 2 BRANCH_MANAGER + 6 ARTIST（與 Railway 刺青師管理列表一致）
INSERT INTO "User" ("id", "email", "hashedPassword", "name", "phone", "role", "branchId", "isActive", "createdAt", "updatedAt") VALUES
('seed-user-admin', 'admin@test.com', '$2b$12$Pr8C3eDKwQqWkTa6lVGSfOeiyEZcUXc/pb026fnboexNVl9vCFHpi', 'Super Admin', '0988666888', 'BOSS', NULL, true, NOW(), NOW()),
('seed-user-mgr1', 'manager1@test.com', '$2b$12$Pr8C3eDKwQqWkTa6lVGSfOeiyEZcUXc/pb026fnboexNVl9vCFHpi', '三重店經理', '0900000001', 'BRANCH_MANAGER', 'seed-branch-1', true, NOW(), NOW()),
('seed-user-mgr2', 'manager2@test.com', '$2b$12$Pr8C3eDKwQqWkTa6lVGSfOeiyEZcUXc/pb026fnboexNVl9vCFHpi', '東港店經理', '0900000002', 'BRANCH_MANAGER', 'seed-branch-2', true, NOW(), NOW()),
('seed-user-zhu-s', 'zhu-chuanjin-sanchong@tattoo.local', '$2b$12$Pr8C3eDKwQqWkTa6lVGSfOeiyEZcUXc/pb026fnboexNVl9vCFHpi', '朱川進', '0900000011', 'ARTIST', 'seed-branch-1', true, NOW(), NOW()),
('seed-user-zhu-d', 'zhu-chuanjin-donggang@tattoo.local', '$2b$12$Pr8C3eDKwQqWkTa6lVGSfOeiyEZcUXc/pb026fnboexNVl9vCFHpi', '朱川進', '0981927959', 'ARTIST', 'seed-branch-2', true, NOW(), NOW()),
('seed-user-chen', 'chen-xiangnan@tattoo.local', '$2b$12$Pr8C3eDKwQqWkTa6lVGSfOeiyEZcUXc/pb026fnboexNVl9vCFHpi', '陳翔男', '0930828952', 'ARTIST', 'seed-branch-2', true, NOW(), NOW()),
('seed-user-huang', 'artist2@test.com', '$2b$12$Pr8C3eDKwQqWkTa6lVGSfOeiyEZcUXc/pb026fnboexNVl9vCFHpi', '黃晨洋', '0939098588', 'ARTIST', 'seed-branch-1', true, NOW(), NOW()),
('seed-user-lin', 'artist3@test.com', '$2b$12$Pr8C3eDKwQqWkTa6lVGSfOeiyEZcUXc/pb026fnboexNVl9vCFHpi', '林承葉', '0974320073', 'ARTIST', 'seed-branch-1', true, NOW(), NOW()),
('seed-user-chenz', 'artist1@test.com', '$2b$12$Pr8C3eDKwQqWkTa6lVGSfOeiyEZcUXc/pb026fnboexNVl9vCFHpi', '陳震宇', '0937981900', 'ARTIST', 'seed-branch-2', true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- TattooArtist（6 位刺青師，專長與後台一致；photoUrl 為預設頭像，上線後可於後台更換為真實照片）
-- 預設頭像使用 Unsplash 示範圖（前端 next.config 已允許 images.unsplash.com）
INSERT INTO "TattooArtist" ("id", "userId", "displayName", "speciality", "branchId", "active", "photoUrl", "createdAt", "updatedAt") VALUES
('seed-artist-1', 'seed-user-zhu-s', '朱川進', '寫實與線條', 'seed-branch-1', true, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', NOW(), NOW()),
('seed-artist-2', 'seed-user-zhu-d', '朱川進', '日式舊傳統、新傳統風格、歐美圖風格', 'seed-branch-2', true, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face', NOW(), NOW()),
('seed-artist-3', 'seed-user-chen', '陳翔男', '日式與傳統風格', 'seed-branch-2', true, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face', NOW(), NOW()),
('seed-artist-4', 'seed-user-huang', '黃晨洋', '幾何圖騰設計', 'seed-branch-1', true, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face', NOW(), NOW()),
('seed-artist-5', 'seed-user-lin', '林承葉', '黑灰寫實風格', 'seed-branch-1', true, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face', NOW(), NOW()),
('seed-artist-6', 'seed-user-chenz', '陳震宇', '日式傳統刺青', 'seed-branch-2', true, 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop&crop=face', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- 基本服務項目
INSERT INTO "Service" ("id", "name", "description", "durationMin", "price", "isActive", "createdAt", "updatedAt") VALUES
('seed-svc-1', '小圖刺青', '簡單小圖', 60, 2000, true, NOW(), NOW()),
('seed-svc-2', '中圖刺青', '中型圖案', 120, 8000, true, NOW(), NOW()),
('seed-svc-3', '大圖刺青', '大型圖案', 240, 20000, true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
