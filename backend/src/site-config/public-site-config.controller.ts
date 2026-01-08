import { Controller, Get, Header } from '@nestjs/common';
import { SiteConfigService } from './site-config.service';

@Controller('public/site-config')
export class PublicSiteConfigController {
  constructor(private readonly siteConfig: SiteConfigService) {}

  @Get('home-hero')
  @Header('Cache-Control', 'no-store')
  async getHomeHero() {
    return await this.siteConfig.getHomeHeroConfig();
  }
}


