import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicSiteConfigController } from './public-site-config.controller';
import { AdminSiteConfigController } from './admin-site-config.controller';
import { SiteConfigService } from './site-config.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicSiteConfigController, AdminSiteConfigController],
  providers: [SiteConfigService],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}


