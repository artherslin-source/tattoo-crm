import { Controller, Get } from '@nestjs/common';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'tattoo-crm-backend',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: { status: 'up' },
    };
  }

  @Get('simple')
  simple() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'tattoo-crm-backend',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  @Get('uploads')
  uploads() {
    const uploadsPath = join(process.cwd(), 'uploads');
    const servicesPath = join(uploadsPath, 'services');
    
    const result: any = {
      status: 'ok',
      uploadsPath,
      uploadsExists: existsSync(uploadsPath),
      servicesExists: existsSync(servicesPath),
      categories: {},
    };

    if (existsSync(servicesPath)) {
      const categories = ['arm', 'leg', 'back', 'other'];
      for (const category of categories) {
        const categoryPath = join(servicesPath, category);
        if (existsSync(categoryPath)) {
          const files = readdirSync(categoryPath).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
          result.categories[category] = {
            exists: true,
            imageCount: files.length,
            sampleFiles: files.slice(0, 3),
          };
        } else {
          result.categories[category] = { exists: false };
        }
      }
    }

    return result;
  }
}
