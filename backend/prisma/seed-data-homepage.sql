-- 首頁「刺青分類」用服務項目（與 frontend SERVICE_DISPLAY_ORDER 一致，數值對齊 Railway）
-- 執行時機：在 seed-data.sql 之後執行，讓 Zeabur 首頁顯示與 Railway 完全一致
-- 使用方式：psql "$DATABASE_URL" -f backend/prisma/seed-data-homepage.sql

INSERT INTO "Service" ("id", "name", "description", "durationMin", "price", "currency", "isActive", "hasVariants", "category", "createdAt", "updatedAt") VALUES
('seed-hp-1',  '半胛圖',     '半胛圖半胛圖半胛圖', 60, 5000, 'TWD', true, false, 'Torso', NOW(), NOW()),
('seed-hp-2',  '排胛圖',     '排肚圖服務，專業技術，品質保證', 360, 15000, 'TWD', true, false, 'Torso', NOW(), NOW()),
('seed-hp-3',  '大腿表面',   '大腿表面服務，專業技術，品質保證', 360, 5000, 'TWD', true, false, 'Leg', NOW(), NOW()),
('seed-hp-4',  '大腿全包',   '大腿全包服務，專業技術，品質保證', 480, 10000, 'TWD', true, false, 'Leg', NOW(), NOW()),
('seed-hp-5',  '小腿表面',   '小腿表面服務，專業技術，品質保證', 300, 5000, 'TWD', true, false, 'Leg', NOW(), NOW()),
('seed-hp-6',  '小腿全包',   '小腿全包服務，專業技術，品質保證', 420, 5000, 'TWD', true, false, 'Leg', NOW(), NOW()),
('seed-hp-7',  '前手臂',     '前手臂服務，專業技術，品質保證', 300, 5000, 'TWD', true, false, 'Arm', NOW(), NOW()),
('seed-hp-8',  '上手臂',     '上手臂服務，專業技術，品質保證', 360, 5000, 'TWD', true, false, 'Arm', NOW(), NOW()),
('seed-hp-9',  '大小腿包全肢', '大小腿包全肢服務，專業技術，品質保證', 660, 20000, 'TWD', true, false, 'Leg', NOW(), NOW()),
('seed-hp-10', '上下手臂全肢', '上下手臂全肢服務，專業技術，品質保證', 600, 10000, 'TWD', true, false, 'Arm', NOW(), NOW()),
('seed-hp-11', '單胸到包全手', '單胸到包全手服務，專業技術，品質保證', 480, 15000, 'TWD', true, false, 'Torso', NOW(), NOW()),
('seed-hp-12', '大背後圖',   '大背後圖服務，專業技術，品質保證', 540, 15000, 'TWD', true, false, 'Back', NOW(), NOW()),
('seed-hp-13', '背後左或右圖', '背後左或右圖服務，專業技術，品質保證', 360, 10000, 'TWD', true, false, 'Back', NOW(), NOW()),
('seed-hp-14', '大背到大腿圖', '大背到大腿圖服務，專業技術，品質保證', 720, 25000, 'TWD', true, false, 'Back', NOW(), NOW()),
('seed-hp-15', '雙胸到腹肚圖', '雙胸到腹肚圖服務，專業技術，品質保證', 540, 15000, 'TWD', true, false, 'Torso', NOW(), NOW()),
('seed-hp-16', '雙前胸口圖', '雙前胸口圖服務，專業技術，品質保證', 420, 10000, 'TWD', true, false, 'Torso', NOW(), NOW()),
('seed-hp-17', '單胸口圖',   '單胸口圖單胸口圖單胸口圖', 60, 5000, 'TWD', true, false, 'Torso', NOW(), NOW()),
('seed-hp-18', '腹肚圖',     '腹肚圖服務，專業技術，品質保證', 330, 10000, 'TWD', true, false, 'Torso', NOW(), NOW()),
('seed-hp-19', '單胸腹肚圖', '單胸腹肚圖服務，專業技術，品質保證', 450, 10000, 'TWD', true, false, 'Torso', NOW(), NOW()),
('seed-hp-20', '圖騰小圖案', '小型圖騰紋身，精緻細膩，適合初次體驗', 60, 1000, 'TWD', true, false, '', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "durationMin" = EXCLUDED."durationMin",
  "price" = EXCLUDED."price",
  "category" = EXCLUDED."category",
  "updatedAt" = NOW();
