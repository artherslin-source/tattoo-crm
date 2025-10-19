import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 配置靜態文件服務
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  
  // CORS 配置 - 支援多個來源
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',') 
    : ['http://localhost:4001', 'http://localhost:3000'];
  
  app.enableCors({
    origin: (origin, callback) => {
      // 允許沒有 origin 的請求（例如 mobile apps, curl）
      if (!origin) return callback(null, true);
      
      // 生產環境允許所有來源（可以根據需求調整）
      if (process.env.NODE_ENV === 'production') {
        return callback(null, true);
      }
      
      // 開發環境檢查白名單
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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
  console.log(`🔄 Deployment Version: 2025-10-19-13:30 - Emergency Database Reset Required`);
}
bootstrap();
