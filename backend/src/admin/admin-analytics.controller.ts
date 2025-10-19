import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminAnalyticsUnifiedService } from './admin-analytics-unified.service';

@Controller('admin/analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsUnifiedService) {}

  @Get()
  async getAnalytics(
    @Query('branchId') branchId?: string,
    @Query('dateRange') dateRange?: string,
  ) {
    return this.analyticsService.getAnalytics(branchId, dateRange);
  }
}

