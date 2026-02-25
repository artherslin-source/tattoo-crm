-- 首頁「刺青分類」用服務項目（與 frontend SERVICE_DISPLAY_ORDER 一致）
-- 執行時機：在 seed-data.sql 之後執行，讓 Zeabur 首頁顯示與 Railway 類似的服務卡片與「加入購物車」
-- 使用方式：psql "$DATABASE_URL" -f backend/prisma/seed-data-homepage.sql

INSERT INTO "Service" ("id", "name", "description", "durationMin", "price", "currency", "isActive", "hasVariants", "createdAt", "updatedAt") VALUES
('seed-hp-1',  '半胛圖',     '半胛圖案', 120, 15000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-2',  '排胛圖',     '排胛圖案', 180, 25000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-3',  '大腿表面',   '大腿表面刺青', 180, 22000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-4',  '大腿全包',   '大腿全包刺青', 300, 45000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-5',  '小腿表面',   '小腿表面刺青', 120, 18000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-6',  '小腿全包',   '小腿全包刺青', 240, 35000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-7',  '前手臂',     '前手臂刺青', 120, 12000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-8',  '上手臂',     '上手臂刺青', 120, 12000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-9',  '大小腿包全肢', '大小腿包全肢', 480, 80000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-10', '上下手臂全肢', '上下手臂全肢', 360, 50000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-11', '單胸到包全手', '單胸到包全手', 420, 70000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-12', '大背後圖',   '大背後圖', 480, 90000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-13', '背後左或右圖', '背後左或右圖', 300, 45000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-14', '大背到大腿圖', '大背到大腿圖', 600, 120000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-15', '雙胸到腹肚圖', '雙胸到腹肚圖', 420, 75000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-16', '雙前胸口圖', '雙前胸口圖', 240, 40000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-17', '單胸口圖',   '單胸口圖', 180, 28000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-18', '腹肚圖',     '腹肚圖', 180, 25000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-19', '單胸腹肚圖', '單胸腹肚圖', 300, 50000, 'TWD', true, false, NOW(), NOW()),
('seed-hp-20', '圖騰小圖案', '圖騰小圖案', 60, 3000, 'TWD', true, false, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
