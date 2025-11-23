import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import session = require('express-session');

async function bootstrap() {
  // 修復 BigInt 序列化問題
  (BigInt.prototype as any).toJSON = function() {
    return this.toString();
  };

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 信任反向代理（Railway 使用代理）
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust first proxy
  }
  
  // 註冊全局異常過濾器（處理 Multer 錯誤等）
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // 配置 Session（用於訪客購物車）
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'tattoo-crm-session-secret-key-2025',
      resave: false,
      saveUninitialized: true,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site cookies in production
      },
    }),
  );
  
  // 確保uploads目錄存在
  const uploadsPath = join(process.cwd(), 'uploads');
  const servicesPath = join(uploadsPath, 'services');
  const portfolioPath = join(uploadsPath, 'portfolio');
  
  // 在 Railway 上，volume 掛載會覆蓋 uploads 目錄，需要從 git 中的文件複製
  // Railway 的工作目錄是 backend/，所以 git 中的文件在 uploads/ 目錄下
  // 但編譯後的代碼在 dist/ 目錄，所以需要從不同路徑查找
  const possibleGitPaths = [
    join(process.cwd(), 'uploads'),                    // 如果工作目錄是 backend/
    join(process.cwd(), 'backend', 'uploads'),         // 如果工作目錄是項目根目錄
    join(__dirname, '..', 'uploads'),                  // 從編譯後的 dist 目錄向上查找
    join(__dirname, '..', '..', 'backend', 'uploads'), // 從 dist 向上兩層到 backend
  ];
  
  let gitUploadsPath: string | null = null;
  for (const testPath of possibleGitPaths) {
    if (existsSync(testPath)) {
      gitUploadsPath = testPath;
      console.log(`📁 Found git uploads at: ${testPath}`);
      break;
    }
  }
  
  // 在生產環境中，強制複製所有圖片文件到 volume（確保圖片可用）
  if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    let copiedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    const copyRecursiveSync = (src: string, dest: string) => {
      if (!existsSync(src)) {
        console.log(`⚠️  Source path does not exist: ${src}`);
        return;
      }
      
      if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true });
        console.log(`📁 Created directory: ${dest}`);
      }
      
      try {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = join(src, entry.name);
          const destPath = join(dest, entry.name);
          
          if (entry.isDirectory()) {
            copyRecursiveSync(srcPath, destPath);
          } else {
            try {
              // 在生產環境中，強制覆蓋以確保圖片是最新的
              fs.copyFileSync(srcPath, destPath);
              copiedCount++;
              if (copiedCount <= 10) { // 顯示前10個
                console.log(`📋 Copied: ${entry.name}`);
              }
            } catch (copyError) {
              errorCount++;
              console.error(`❌ Failed to copy ${entry.name}:`, copyError);
            }
          }
        }
      } catch (readError) {
        console.error(`❌ Failed to read directory ${src}:`, readError);
      }
    };
    
    if (gitUploadsPath) {
      // 複製服務圖片
      const gitServicesPath = join(gitUploadsPath, 'services');
      if (existsSync(gitServicesPath)) {
        console.log(`🔄 Copying service images from ${gitServicesPath} to ${servicesPath}...`);
        copyRecursiveSync(gitServicesPath, servicesPath);
        console.log(`✅ Image copy completed: ${copiedCount} copied, ${skippedCount} skipped, ${errorCount} errors`);
      } else {
        console.log(`⚠️  Git services path not found: ${gitServicesPath}`);
      }
    } else {
      console.log(`⚠️  Production mode but git uploads path not found.`);
      console.log(`   Tried paths: ${possibleGitPaths.join(', ')}`);
      console.log(`   Current working directory: ${process.cwd()}`);
      console.log(`   __dirname: ${__dirname}`);
    }
  }
  
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
    console.log('📁 Created uploads directory');
  }
  
  if (!existsSync(servicesPath)) {
    mkdirSync(servicesPath, { recursive: true });
    console.log('📁 Created uploads/services directory');
  }
  
  if (!existsSync(portfolioPath)) {
    mkdirSync(portfolioPath, { recursive: true });
    console.log('📁 Created uploads/portfolio directory');
  }
  
  // 創建服務分類目錄
  const serviceCategories = ['arm', 'leg', 'back', 'other'];
  for (const category of serviceCategories) {
    const categoryPath = join(servicesPath, category);
    if (!existsSync(categoryPath)) {
      mkdirSync(categoryPath, { recursive: true });
      console.log(`📁 Created uploads/services/${category} directory`);
    }
  }
  
  // 配置靜態文件服務
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });
  
  // CORS 配置 - 顯式允許 Railway 網域與本地開發
  // 生產環境快速解法：反射請求來源（等同允許所有合法來源）
  // 若需更嚴格控制，可改回白名單陣列
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  
  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0'); // 監聽所有網路介面
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Backend accessible at: http://0.0.0.0:${port}`);
  console.log(`🔄 Deployment Version: 2025-10-20-06:00 - Fix Image Upload API`);
}
bootstrap();
