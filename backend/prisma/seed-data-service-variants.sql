-- 為首頁服務（seed-hp-*）建立預設規格：尺寸、顏色、部位、設計費
-- 執行時機：在 seed-data-homepage.sql 之後執行
-- 使用方式：psql "$DATABASE_URL" -f backend/prisma/seed-data-service-variants.sql

-- 避免重複插入（若已存在則跳過）
INSERT INTO "ServiceVariant" ("id", "serviceId", "type", "name", "code", "description", "priceModifier", "sortOrder", "isActive", "isRequired", "createdAt", "updatedAt")
SELECT * FROM (
  -- 尺寸規格（12 個） × 20 個服務
  SELECT 'sv-' || s.id || '-size-' || v.ord AS id, s.id AS "serviceId", 'size' AS type, v.name, v.code, v.descr AS description, v.mod AS "priceModifier", v.ord AS "sortOrder", true AS "isActive", true AS "isRequired", NOW() AS "createdAt", NOW() AS "updatedAt"
  FROM (SELECT unnest(ARRAY['seed-hp-1','seed-hp-2','seed-hp-3','seed-hp-4','seed-hp-5','seed-hp-6','seed-hp-7','seed-hp-8','seed-hp-9','seed-hp-10','seed-hp-11','seed-hp-12','seed-hp-13','seed-hp-14','seed-hp-15','seed-hp-16','seed-hp-17','seed-hp-18','seed-hp-19','seed-hp-20']) AS id) s
  CROSS JOIN (VALUES
    (1, '5-6cm', 'S1', '5-6cm（黑白2000/彩色3000）', 2000),
    (2, '6-7cm', 'S2', '6-7cm（黑白3000/彩色4000）', 3000),
    (3, '7-8cm', 'S3', '7-8cm（黑白4000/彩色5000）', 4000),
    (4, '8-9cm', 'S4', '8-9cm（黑白5000/彩色6000）', 5000),
    (5, '9-10cm', 'S5', '9-10cm（黑白6000/彩色7000）', 6000),
    (6, '10-11cm', 'S6', '10-11cm（黑白7000/彩色8000）', 7000),
    (7, '11-12cm', 'S7', '11-12cm（黑白8000/彩色9000）', 8000),
    (8, '12-13cm', 'S8', '12-13cm（黑白9000/彩色10000）', 9000),
    (9, '13-14cm', 'S9', '13-14cm（黑白10000/彩色11000）', 10000),
    (10, '14-15cm', 'S10', '14-15cm（黑白11000/彩色12000）', 11000),
    (11, '15-16cm', 'S11', '15-16cm（黑白12000/彩色13000）', 12000),
    (12, '16-17cm', 'S12', '16-17cm（黑白14000/彩色14000）', 14000)
  ) AS v(ord, name, code, descr, mod)
  UNION ALL
  -- 顏色規格（2 個） × 20 個服務
  SELECT 'sv-' || s.id || '-color-' || v.ord, s.id, 'color', v.name, v.code, v.descr, v.mod, v.ord, true, true, NOW(), NOW()
  FROM (SELECT unnest(ARRAY['seed-hp-1','seed-hp-2','seed-hp-3','seed-hp-4','seed-hp-5','seed-hp-6','seed-hp-7','seed-hp-8','seed-hp-9','seed-hp-10','seed-hp-11','seed-hp-12','seed-hp-13','seed-hp-14','seed-hp-15','seed-hp-16','seed-hp-17','seed-hp-18','seed-hp-19','seed-hp-20']) AS id) s
  CROSS JOIN (VALUES
    (1, '黑白', 'BW', '黑白陰影', 0),
    (2, '彩色', 'COLOR', '彩色上色（大部分尺寸+1000）', 1000)
  ) AS v(ord, name, code, descr, mod)
  UNION ALL
  -- 部位規格（6 個） × 20 個服務
  SELECT 'sv-' || s.id || '-position-' || v.ord, s.id, 'position', v.name, v.code, v.descr, v.mod, v.ord, true, false, NOW(), NOW()
  FROM (SELECT unnest(ARRAY['seed-hp-1','seed-hp-2','seed-hp-3','seed-hp-4','seed-hp-5','seed-hp-6','seed-hp-7','seed-hp-8','seed-hp-9','seed-hp-10','seed-hp-11','seed-hp-12','seed-hp-13','seed-hp-14','seed-hp-15','seed-hp-16','seed-hp-17','seed-hp-18','seed-hp-19','seed-hp-20']) AS id) s
  CROSS JOIN (VALUES
    (1, '手臂外側', 'P1', '手臂外側面', 0),
    (2, '手臂內側', 'P2', '手臂內側面', 200),
    (3, '小腿', 'P3', '小腿部位', 0),
    (4, '大腿', 'P4', '大腿部位', 500),
    (5, '背部', 'P5', '背部區域', 1000),
    (6, '胸部', 'P6', '胸部區域', 800)
  ) AS v(ord, name, code, descr, mod)
  UNION ALL
  -- 設計費規格（1 個） × 20 個服務
  SELECT 'sv-' || s.id || '-design_fee-1', s.id, 'design_fee', '設計費', 'DESIGN', '另外估價（需管理後台輸入）', 0, 1, true, false, NOW(), NOW()
  FROM (SELECT unnest(ARRAY['seed-hp-1','seed-hp-2','seed-hp-3','seed-hp-4','seed-hp-5','seed-hp-6','seed-hp-7','seed-hp-8','seed-hp-9','seed-hp-10','seed-hp-11','seed-hp-12','seed-hp-13','seed-hp-14','seed-hp-15','seed-hp-16','seed-hp-17','seed-hp-18','seed-hp-19','seed-hp-20']) AS id) s
) sub
WHERE NOT EXISTS (SELECT 1 FROM "ServiceVariant" WHERE "ServiceVariant".id = sub.id);

-- 將所有首頁服務標記為「已設定規格」
UPDATE "Service" SET "hasVariants" = true WHERE "id" LIKE 'seed-hp-%';
