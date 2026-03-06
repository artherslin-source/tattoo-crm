#!/usr/bin/env node
/**
 * 【僅供 Zeabur 使用，請勿在 Railway 上執行】
 * Zeabur 規格種子（做法 A）：依「服務名稱」對齊 Railway 正確規格
 * 使用方式（Zeabur Execute Command）：node scripts/seed-zeabur-variants-railway-style.js
 * 保護客戶資料：僅異動 Service、ServiceVariant 及 seed-svc-*，不碰 User、Artist、PortfolioItem、uploads/。
 */
// 最先偵測 Railway：不載入任何模組即退出
if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME) {
  console.log('[Zeabur-only] 偵測到 Railway 環境，略過（此腳本僅供 Zeabur 使用）');
  process.exit(0);
}

const path = require('path');
const fs = require('fs');

const backendDir = fs.existsSync(path.join(__dirname, '../prisma')) ? path.join(__dirname, '..') : path.join(process.cwd(), 'backend');
try {
  require('dotenv').config({ path: path.join(backendDir, '.env') });
} catch (_) {}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Railway 對齊：服務名稱 -> 割線, 黑白, 半彩, 全彩 (NT$), 是否有 side；可選 colorCodes 對齊 Railway（割線 LINE/OUTLINE，半彩 HALF/SEMI_COLOR，全彩 FULL/COLOR）
const COLOR_PRICES_BY_SERVICE_NAME = {
  '半胛圖': { outline: 5000, bw: 40000, semi: 50000, full: 60000, hasSide: true, colorCodes: { outline: 'LINE', semi: 'HALF', full: 'FULL' } },
  '排胛圖': { outline: 15000, bw: 100000, semi: 120000, full: 150000, hasSide: true },
  '大腿表面': { outline: 5000, bw: 30000, semi: 40000, full: 50000, hasSide: true },
  '大腿全包': { outline: 10000, bw: 80000, semi: 100000, full: 150000, hasSide: true },
  '小腿表面': { outline: 5000, bw: 20000, semi: 30000, full: 40000, hasSide: true },
  '小腿全包': { outline: 5000, bw: 40000, semi: 50000, full: 60000, hasSide: true },
  '前手臂': { outline: 5000, bw: 30000, semi: 35000, full: 40000, hasSide: true },
  '上手臂': { outline: 5000, bw: 30000, semi: 35000, full: 40000, hasSide: true },
  '大小腿包全肢': { outline: 20000, bw: 150000, semi: 180000, full: 200000, hasSide: true },
  '上下手臂全肢': { outline: 10000, bw: 80000, semi: 120000, full: 150000, hasSide: true },
  '單胸到包全手': { outline: 15000, bw: 100000, semi: 150000, full: 180000, hasSide: true },
  '大背後圖': { outline: 15000, bw: 150000, semi: 180000, full: 200000, hasSide: false },
  '背後左或右圖': { outline: 10000, bw: 70000, semi: 80000, full: 100000, hasSide: true },
  '大背到大腿圖': { outline: 25000, bw: 180000, semi: 250000, full: 300000, hasSide: false },
  '雙胸到腹肚圖': { outline: 10000, bw: 50000, semi: 70000, full: 90000, hasSide: false },
  '雙前胸口圖': { outline: 10000, bw: 40000, semi: 50000, full: 60000, hasSide: false },
  '單胸口圖': { outline: 5000, bw: 20000, semi: 25000, full: 30000, hasSide: true, colorCodes: { outline: 'LINE', semi: 'HALF', full: 'FULL' } },
  '腹肚圖': { outline: 15000, bw: 150000, semi: 180000, full: 200000, hasSide: false },
  '單胸腹肚圖': { outline: 10000, bw: 80000, semi: 100000, full: 120000, hasSide: true },
};

// 圖騰小圖案：尺寸（Railway 格式）
const TOTEM_SIZE_VARIANTS = [
  { name: 'Z (≤3cm)', code: 'Z', priceModifier: 1000, sortOrder: 0, metadata: { blackWhitePrice: 1000, colorPrice: 1000, priceDiff: 0 } },
  { name: 'T-1 (5-6cm)', code: 'T-1', priceModifier: 2000, sortOrder: 1, metadata: { blackWhitePrice: 2000, colorPrice: 3000, priceDiff: 1000 } },
  { name: 'T-2 (6-7cm)', code: 'T-2', priceModifier: 3000, sortOrder: 2, metadata: { blackWhitePrice: 3000, colorPrice: 4000, priceDiff: 1000 } },
  { name: 'U-1 (7-8cm)', code: 'U-1', priceModifier: 4000, sortOrder: 3, metadata: { blackWhitePrice: 4000, colorPrice: 5000, priceDiff: 1000 } },
  { name: 'U-2 (8-9cm)', code: 'U-2', priceModifier: 5000, sortOrder: 4, metadata: { blackWhitePrice: 5000, colorPrice: 6000, priceDiff: 1000 } },
  { name: 'V-1 (9-10cm)', code: 'V-1', priceModifier: 6000, sortOrder: 5, metadata: { blackWhitePrice: 6000, colorPrice: 7000, priceDiff: 1000 } },
  { name: 'V-2 (10-11cm)', code: 'V-2', priceModifier: 7000, sortOrder: 6, metadata: { blackWhitePrice: 7000, colorPrice: 8000, priceDiff: 1000 } },
  { name: 'W-1 (11-12cm)', code: 'W-1', priceModifier: 8000, sortOrder: 7, metadata: { blackWhitePrice: 8000, colorPrice: 9000, priceDiff: 1000 } },
  { name: 'W-2 (12-13cm)', code: 'W-2', priceModifier: 9000, sortOrder: 8, metadata: { blackWhitePrice: 9000, colorPrice: 10000, priceDiff: 1000 } },
  { name: 'X-1 (13-14cm)', code: 'X-1', priceModifier: 10000, sortOrder: 9, metadata: { blackWhitePrice: 10000, colorPrice: 11000, priceDiff: 1000 } },
  { name: 'X-2 (14-15cm)', code: 'X-2', priceModifier: 11000, sortOrder: 10, metadata: { blackWhitePrice: 11000, colorPrice: 12000, priceDiff: 1000 } },
  { name: 'Y-1 (15-16cm)', code: 'Y-1', priceModifier: 12000, sortOrder: 11, metadata: { blackWhitePrice: 12000, colorPrice: 13000, priceDiff: 1000 } },
  { name: 'Y-2 (16-17cm)', code: 'Y-2', priceModifier: 13000, sortOrder: 12, metadata: { blackWhitePrice: 13000, colorPrice: 14000, priceDiff: 1000 } },
];

async function seedServiceVariants(service) {
  const { id: serviceId, name } = service;
  await prisma.serviceVariant.deleteMany({ where: { serviceId } });

  if (name === '圖騰小圖案') {
    await prisma.serviceVariant.createMany({
      data: [
        ...TOTEM_SIZE_VARIANTS.map((v) => ({
          serviceId,
          type: 'size',
          name: v.name,
          code: v.code,
          description: null,
          priceModifier: v.priceModifier,
          sortOrder: v.sortOrder,
          isActive: true,
          isRequired: false,
          metadata: v.metadata,
        })),
        {
          serviceId,
          type: 'color',
          name: '黑白',
          code: 'BW',
          description: null,
          priceModifier: 0,
          sortOrder: 1,
          isActive: true,
          isRequired: false,
          metadata: { note: '價格已包含在尺寸中' },
        },
        {
          serviceId,
          type: 'color',
          name: '彩色',
          code: 'COLOR',
          description: null,
          priceModifier: 0,
          sortOrder: 2,
          isActive: true,
          isRequired: false,
          metadata: { note: '價格根據尺寸從 metadata 計算', useSizeMetadata: true },
        },
        { serviceId, type: 'side', name: '左半邊', code: 'LEFT', description: null, priceModifier: 0, sortOrder: 1, isActive: true, isRequired: false, metadata: null },
        { serviceId, type: 'side', name: '右半邊', code: 'RIGHT', description: null, priceModifier: 0, sortOrder: 2, isActive: true, isRequired: false, metadata: null },
        { serviceId, type: 'design_fee', name: '設計費', code: 'DESIGN', description: null, priceModifier: 0, sortOrder: 1, isActive: true, isRequired: false, metadata: null },
        { serviceId, type: 'custom_addon', name: '增出範圍與細膩度加購', code: 'ADDON', description: '需事前與刺青師討論評估後加購（價格由用戶輸入）', priceModifier: 0, sortOrder: 1, isActive: true, isRequired: false, metadata: null },
      ],
    });
    return;
  }

  const prices = COLOR_PRICES_BY_SERVICE_NAME[name];
  if (!prices) {
    console.warn(`   ⚠️ 未定義規格，跳過: ${name}`);
    return;
  }

  const codes = prices.colorCodes || {};
  const outlineCode = codes.outline || 'OUTLINE';
  const semiCode = codes.semi || 'SEMI_COLOR';
  const fullCode = codes.full || 'COLOR';
  const data = [
    { serviceId, type: 'color', name: '割線', code: outlineCode, description: null, priceModifier: prices.outline, sortOrder: 1, isActive: true, isRequired: false, metadata: null },
    { serviceId, type: 'color', name: '黑白', code: 'BW', description: '黑白陰影', priceModifier: prices.bw, sortOrder: 2, isActive: true, isRequired: false, metadata: null },
    { serviceId, type: 'color', name: '半彩', code: semiCode, description: null, priceModifier: prices.semi, sortOrder: 3, isActive: true, isRequired: false, metadata: null },
    { serviceId, type: 'color', name: '全彩', code: fullCode, description: fullCode === 'COLOR' ? '彩色上色（大部分尺寸+1000）' : null, priceModifier: prices.full, sortOrder: 4, isActive: true, isRequired: false, metadata: null },
    { serviceId, type: 'design_fee', name: '設計費', code: 'DESIGN', description: '另外估價（需管理後台輸入）', priceModifier: 0, sortOrder: 1, isActive: true, isRequired: false, metadata: { displayText: '另外估價', isCustomPrice: true } },
    { serviceId, type: 'custom_addon', name: '增出範圍與細膩度加購', code: 'ADDON', description: '需事前與刺青師討論評估後加購（價格由用戶輸入）', priceModifier: 0, sortOrder: 1, isActive: true, isRequired: false, metadata: null },
  ];
  if (prices.hasSide) {
    data.push(
      { serviceId, type: 'side', name: '左半邊', code: 'LEFT', description: null, priceModifier: 0, sortOrder: 1, isActive: true, isRequired: false, metadata: null },
      { serviceId, type: 'side', name: '右半邊', code: 'RIGHT', description: null, priceModifier: 0, sortOrder: 2, isActive: true, isRequired: false, metadata: null }
    );
  }
  await prisma.serviceVariant.createMany({ data });
}

const ZEABUR_REMOVE_SERVICE_IDS = ['seed-svc-1', 'seed-svc-2', 'seed-svc-3'];

async function main() {
  console.log('📂 Zeabur 規格種子（對齊 Railway）\n');

  // 刪除 Zeabur 多出的 3 筆服務（小圖/中圖/大圖刺青），使 API 與首頁僅回傳 20 筆
  const removeIds = { in: ZEABUR_REMOVE_SERVICE_IDS };
  await prisma.serviceHistory.deleteMany({ where: { serviceId: removeIds } });
  await prisma.completedService.deleteMany({ where: { serviceId: removeIds } });
  const deletedCart = await prisma.cartItem.deleteMany({ where: { serviceId: removeIds } });
  if (deletedCart.count > 0) console.log(`  已移除 ${deletedCart.count} 筆購物車項目（屬多餘服務）`);
  await prisma.appointment.updateMany({ where: { serviceId: removeIds }, data: { serviceId: null } });
  const deleted = await prisma.service.deleteMany({ where: { id: { in: ZEABUR_REMOVE_SERVICE_IDS } } });
  if (deleted.count > 0) console.log(`  已刪除多餘服務：${deleted.count} 筆（小圖/中圖/大圖刺青）\n`);

  const services = await prisma.service.findMany({
    where: { id: { startsWith: 'seed-hp-' } },
    orderBy: { id: 'asc' },
  });
  if (services.length === 0) {
    console.log('找不到 seed-hp-* 服務，請先執行首頁服務種子（seed-data-homepage.sql 或 run-seed-homepage-and-variants.js 第一步）。');
    await prisma.$disconnect();
    process.exit(1);
  }

  for (const service of services) {
    console.log(`  ${service.id} ${service.name} ...`);
    await seedServiceVariants(service);
  }

  await prisma.service.updateMany({
    where: { id: { startsWith: 'seed-hp-' } },
    data: { hasVariants: true },
  });

  console.log('\n✅ 完成。20 個服務已依 Railway 規格寫入。');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
