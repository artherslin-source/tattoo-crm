-- 為已存在的 6 位種子刺青師補上預設頭像（僅需在「已跑過 seed-data.sql 但當時沒有 photoUrl」的 DB 執行一次）
-- 使用方式：psql "$DATABASE_URL" -f backend/prisma/seed-data-artist-photos.sql

UPDATE "TattooArtist" SET "photoUrl" = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face' WHERE "id" = 'seed-artist-1';
UPDATE "TattooArtist" SET "photoUrl" = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face' WHERE "id" = 'seed-artist-2';
UPDATE "TattooArtist" SET "photoUrl" = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face' WHERE "id" = 'seed-artist-3';
UPDATE "TattooArtist" SET "photoUrl" = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face' WHERE "id" = 'seed-artist-4';
UPDATE "TattooArtist" SET "photoUrl" = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face' WHERE "id" = 'seed-artist-5';
UPDATE "TattooArtist" SET "photoUrl" = 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop&crop=face' WHERE "id" = 'seed-artist-6';
