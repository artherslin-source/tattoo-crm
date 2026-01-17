import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync, readdirSync, readFileSync, copyFileSync } from 'fs';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import session = require('express-session');

async function bootstrap() {
  // 修復 BigInt 序列化問題
  (BigInt.prototype as any).toJSON = function() {
    return this.toString();
  };

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // 關閉內建 bodyParser，我們手動配置
  });
  
  // CORS 配置必須在所有中間件之前
  app.enableCors({
    origin: true, // 允許所有來源（Railway 環境）
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Cache-Control',
      'X-Requested-With',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  
  // 增加請求主體大小限制（支援照片上傳）
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));
  
  // 信任反向代理（用於取得「真正的使用者 IP」）
  //
  // 目標：
  // - 預設最安全：不信任任何代理（避免有人偽造 X-Forwarded-For）
  // - Railway 這種「一定有代理」的環境：自動信任 1 層代理，讓 req.ip 變成使用者真 IP
  // - 永遠允許手動覆蓋：用 TRUST_PROXY_HOPS=0/1/2... 控制（方便未來換主機/架構）
  const trustProxyEnvRaw = process.env.TRUST_PROXY_HOPS;
  const isRailway =
    !!process.env.RAILWAY_ENVIRONMENT ||
    !!process.env.RAILWAY_PROJECT_ID ||
    !!process.env.RAILWAY_SERVICE_ID;

  let trustProxySetting: false | number = false;
  if (typeof trustProxyEnvRaw === 'string') {
    const v = trustProxyEnvRaw.trim().toLowerCase();
    if (v === '' || v === '0' || v === 'false' || v === 'off' || v === 'no') {
      trustProxySetting = false;
    } else {
      const n = Number(v);
      trustProxySetting = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1; // 非法值就當成 1
    }
  } else if (process.env.NODE_ENV === 'production' && isRailway) {
    trustProxySetting = 1;
  }

  app.set('trust proxy', trustProxySetting);
  console.log(
    `🔐 trust proxy: ${trustProxySetting === false ? 'disabled' : trustProxySetting} (TRUST_PROXY_HOPS=${trustProxyEnvRaw ?? 'unset'}, railway=${isRailway})`,
  );
  
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
        
        // 驗證複製結果：檢查每個分類目錄中的圖片數量
        const categories = ['arm', 'leg', 'back', 'other'];
        let totalImages = 0;
        for (const category of categories) {
          const categoryPath = join(servicesPath, category);
          if (existsSync(categoryPath)) {
            const images = fs.readdirSync(categoryPath).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
            totalImages += images.length;
            console.log(`   ${category}: ${images.length} 張圖片`);
          }
        }
        console.log(`   📊 總共: ${totalImages} 張圖片`);
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
  
  // 配置靜態文件服務（加上更長的 cache 與 404 處理）
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
    maxAge: '1d', // 1 天快取
    setHeaders: (res, path) => {
      // 所有圖片檔案設定 1 天快取
      if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path)) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
      }
    },
  });

  // 處理 /uploads 404 錯誤（避免 502）
  app.use('/uploads', (req, res, next) => {
    if (!res.headersSent) {
      res.status(404).json({ error: 'File not found', path: req.path });
    }
  });
  
  // 在生產環境中，確保所有服務項目的圖片文件都存在並正確匹配
  if (process.env.NODE_ENV === 'production' && gitUploadsPath) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      // 建立圖片映射：服務名稱 -> 圖片URL
      const imageMap = new Map<string, string>();
      const gitServicesPath = join(gitUploadsPath, 'services');
      const categories = ['arm', 'leg', 'back', 'other'];
      
      for (const category of categories) {
        const categoryPath = join(gitServicesPath, category);
        if (existsSync(categoryPath)) {
          const files = readdirSync(categoryPath).filter(f => 
            /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
          );
          
          for (const file of files) {
            // 讀取 metadata 獲取原始檔名
            const metaPath = join(categoryPath, `${file}.meta.json`);
            let serviceName = file;
            
            if (existsSync(metaPath)) {
              try {
                const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
                serviceName = (meta.originalName || meta.displayName || file).replace(/\.[^/.]+$/, '');
              } catch (e) {
                // 忽略 metadata 讀取錯誤
              }
            } else {
              // 如果沒有 metadata，從檔名推測（去除時間戳和隨機字串）
              serviceName = file.replace(/^service-\d+-[^-]+-/, '').replace(/\.[^/.]+$/, '');
            }
            
            const imageUrl = `/uploads/services/${category}/${file}`;
            // 如果已經有這個服務名稱的圖片，保留最新的（檔名時間戳較大）
            if (!imageMap.has(serviceName) || file > imageMap.get(serviceName)!.split('/').pop()!) {
              imageMap.set(serviceName, imageUrl);
            }
          }
        }
      }
      
      console.log(`📸 建立圖片映射: ${imageMap.size} 張圖片`);
      
      // 獲取所有服務項目並匹配圖片
      const services = await prisma.service.findMany({
        where: { isActive: true },
        select: { id: true, name: true, imageUrl: true },
      });
      
      let updatedCount = 0;
      let fixedCount = 0;
      
      for (const service of services) {
        const matchedImageUrl = imageMap.get(service.name);
        
        if (matchedImageUrl) {
          // 檢查圖片文件是否存在
          const imagePath = join(process.cwd(), matchedImageUrl);
          const currentImagePath = service.imageUrl ? join(process.cwd(), service.imageUrl) : null;
          
          // 如果圖片URL不同，或者當前圖片文件不存在，則更新
          if (service.imageUrl !== matchedImageUrl || (currentImagePath && !existsSync(currentImagePath))) {
            // 確保圖片文件存在
            if (!existsSync(imagePath)) {
              // 從 git 複製
              const fileName = matchedImageUrl.split('/').pop()!;
              const category = matchedImageUrl.split('/')[3];
              const gitImagePath = join(gitServicesPath, category, fileName);
              
              if (existsSync(gitImagePath)) {
                const destCategoryPath = join(servicesPath, category);
                if (!existsSync(destCategoryPath)) {
                  mkdirSync(destCategoryPath, { recursive: true });
                }
                const destImagePath = join(destCategoryPath, fileName);
                copyFileSync(gitImagePath, destImagePath);
                
                // 複製 metadata
                const gitMetaPath = `${gitImagePath}.meta.json`;
                if (existsSync(gitMetaPath)) {
                  copyFileSync(gitMetaPath, `${destImagePath}.meta.json`);
                }
                
                fixedCount++;
                console.log(`📸 複製圖片文件: ${fileName} -> ${destImagePath}`);
              } else {
                console.warn(`⚠️  Git圖片文件不存在: ${gitImagePath}`);
              }
            }
            
            // 更新資料庫（即使圖片文件已存在，也確保URL正確）
            await prisma.service.update({
              where: { id: service.id },
              data: { imageUrl: matchedImageUrl },
            });
            
            updatedCount++;
            if (updatedCount <= 5) {
              console.log(`✅ 更新「${service.name}」的圖片: ${matchedImageUrl}`);
            }
          } else {
            // 即使URL匹配，也確保圖片文件存在
            if (!existsSync(imagePath)) {
              const fileName = matchedImageUrl.split('/').pop()!;
              const category = matchedImageUrl.split('/')[3];
              const gitImagePath = join(gitServicesPath, category, fileName);
              
              if (existsSync(gitImagePath)) {
                const destCategoryPath = join(servicesPath, category);
                if (!existsSync(destCategoryPath)) {
                  mkdirSync(destCategoryPath, { recursive: true });
                }
                const destImagePath = join(destCategoryPath, fileName);
                copyFileSync(gitImagePath, destImagePath);
                
                // 複製 metadata
                const gitMetaPath = `${gitImagePath}.meta.json`;
                if (existsSync(gitMetaPath)) {
                  copyFileSync(gitMetaPath, `${destImagePath}.meta.json`);
                }
                
                fixedCount++;
                console.log(`📸 修復圖片文件: ${fileName} -> ${destImagePath}`);
              }
            }
          }
        }
      }
      
      if (updatedCount > 0 || fixedCount > 0) {
        console.log(`✅ 更新了 ${updatedCount} 個服務項目的圖片URL，修復了 ${fixedCount} 個圖片文件`);
      } else {
        console.log('✅ 所有服務項目的圖片都已正確設置');
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('⚠️  確保服務項目圖片失敗:', error);
      // 不阻止服務啟動
    }
  }

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0'); // 監聽所有網路介面
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Backend accessible at: http://0.0.0.0:${port}`);
  console.log(`🔄 Deployment Version: 2025-10-20-06:00 - Fix Image Upload API`);
}
bootstrap();
