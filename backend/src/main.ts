import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 確保uploads目錄存在
  const uploadsPath = join(process.cwd(), 'uploads');
  const servicesPath = join(uploadsPath, 'services');
  const portfolioPath = join(uploadsPath, 'portfolio');
  
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
  const dynamicOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : [];

  app.enableCors({
    // 使用 cors 套件原生的多型設定（string | RegExp | (string|RegExp)[]）
    origin: [
      /\.railway\.app$/, // 允許所有 Railway 子網域（前後端分服務）
      'http://localhost:3000',
      'http://localhost:4001',
      ...dynamicOrigins,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
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
