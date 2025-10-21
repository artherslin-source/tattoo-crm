-- 緊急修復 Railway 資料庫 schema
-- 添加缺失的 photoUrl 欄位

ALTER TABLE "TattooArtist" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;

-- 驗證欄位是否添加成功
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'TattooArtist' 
AND column_name = 'photoUrl';
