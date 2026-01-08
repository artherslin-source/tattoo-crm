import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { HomeHeroConfig } from './site-config.types';
import { DEFAULT_HOME_HERO_CONFIG, HOME_HERO_KEY } from './site-config.types';

@Injectable()
export class SiteConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getHomeHeroConfig(): Promise<HomeHeroConfig> {
    const row = await this.prisma.siteConfig.findUnique({
      where: { key: HOME_HERO_KEY },
    });
    if (!row) return DEFAULT_HOME_HERO_CONFIG;
    return (row.value as unknown as HomeHeroConfig) ?? DEFAULT_HOME_HERO_CONFIG;
  }

  async upsertHomeHeroConfig(input: { config: HomeHeroConfig; updatedById?: string | null }) {
    return this.prisma.siteConfig.upsert({
      where: { key: HOME_HERO_KEY },
      create: {
        key: HOME_HERO_KEY,
        value: input.config as any,
        updatedById: input.updatedById ?? null,
      },
      update: {
        value: input.config as any,
        updatedById: input.updatedById ?? null,
      },
    });
  }
}


