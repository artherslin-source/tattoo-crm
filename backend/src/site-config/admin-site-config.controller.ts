import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { z } from 'zod';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';
import { isBoss } from '../common/access/access.types';
import { SiteConfigService } from './site-config.service';
import { DEFAULT_HOME_HERO_CONFIG, type HomeHeroConfig } from './site-config.types';

const HomeHeroConfigSchema: z.ZodType<HomeHeroConfig> = z.object({
  imageUrl: z.string().min(1),
  imageAlt: z.string().min(1).max(500),
  badgeText: z.string().min(1).max(80),
  headlineLines: z.array(z.string().min(1).max(60)).min(1).max(4),
  description: z.string().min(1).max(600),
  primaryCtaText: z.string().min(1).max(30),
  stats: z
    .array(
      z.object({
        value: z.string().min(1).max(20),
        label: z.string().min(1).max(30),
      }),
    )
    .length(4),
});

@Controller('admin/site-config')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class AdminSiteConfigController {
  constructor(private readonly siteConfig: SiteConfigService) {}

  @Get('home-hero')
  async getHomeHero(@Actor() actor: AccessActor) {
    if (!isBoss(actor)) throw new ForbiddenException('BOSS only');
    return await this.siteConfig.getHomeHeroConfig();
  }

  @Patch('home-hero')
  async patchHomeHero(@Actor() actor: AccessActor, @Body() body: unknown) {
    if (!isBoss(actor)) throw new ForbiddenException('BOSS only');
    try {
      const parsed = HomeHeroConfigSchema.parse(body);
      await this.siteConfig.upsertHomeHeroConfig({ config: parsed, updatedById: actor.id });
      return { success: true };
    } catch (e: any) {
      if (e?.issues) {
        throw new BadRequestException({
          message: 'Invalid hero config',
          issues: e.issues,
          default: DEFAULT_HOME_HERO_CONFIG,
        });
      }
      throw new BadRequestException(e?.message || 'Invalid hero config');
    }
  }

  @Post('home-hero/upload-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          try {
            const uploadPath = join(process.cwd(), 'uploads', 'site', 'home-hero');
            if (!existsSync(uploadPath)) {
              mkdirSync(uploadPath, { recursive: true });
            }
            callback(null, uploadPath);
          } catch (error) {
            callback(new Error('無法創建上傳目錄'), '');
          }
        },
        filename: (req, file, callback) => {
          try {
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 8);
            const ext = extname(file.originalname || '');
            const filename = `hero-${timestamp}-${randomString}${ext}`;
            callback(null, filename);
          } catch {
            callback(new Error('無法生成檔名'), '');
          }
        },
      }),
      fileFilter: (req, file, callback) => {
        try {
          if (!file?.originalname) return callback(new Error('文件資訊不完整'), false);
          if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            return callback(new Error('只允許上傳圖片文件 (JPG, JPEG, PNG, GIF, WebP)'), false);
          }
          callback(null, true);
        } catch {
          callback(new Error('文件驗證失敗'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadHomeHeroImage(
    @Actor() actor: AccessActor,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!isBoss(actor)) throw new ForbiddenException('BOSS only');
    if (!file) throw new BadRequestException('沒有選擇要上傳的圖片文件');
    const url = `/uploads/site/home-hero/${file.filename}`;
    return { success: true, url, filename: file.filename };
  }
}


