import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CacheService } from '../common/cache.service';

@Controller('admin/cache')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS')
export class AdminCacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get('stats')
  getCacheStats() {
    return this.cacheService.getStats();
  }

  @Delete('clear')
  clearAllCache() {
    this.cacheService.invalidateAll();
    return { message: '快取已清除', success: true };
  }

  @Delete('clear/:key')
  clearCacheByKey(@Param('key') key: string) {
    this.cacheService.invalidate(key);
    return { message: `快取 ${key} 已清除`, success: true };
  }

  @Delete('clean')
  cleanExpiredCache() {
    this.cacheService.cleanExpired();
    const stats = this.cacheService.getStats();
    return { message: '已清理過期快取', stats };
  }
}

