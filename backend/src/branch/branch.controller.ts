import { Controller, Get, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrdersService } from '../orders/orders.service';
import { ArtistsService } from '../artists/artists.service';
import { buildActorFromJwtUser } from '../common/access/access.types';

@Controller('branch')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BRANCH_MANAGER')
export class BranchController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly artistsService: ArtistsService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return {
      message: 'Welcome to Branch Dashboard',
      data: {
        totalUsers: 0,
        totalServices: 0,
        totalAppointments: 0,
      }
    };
  }

  // 訂單管理 API - 只顯示該分店的訂單
  @Get('orders')
  async getOrders(@Query() query: any, @Req() req: any) {
    // 分店經理只能看到自己分店的訂單
    const branchQuery = { ...query, branchId: req.user.branchId };
    const actor = buildActorFromJwtUser(req.user);
    if (!actor) throw new ForbiddenException('Insufficient permissions');
    return this.ordersService.getOrders(branchQuery, actor);
  }

  // 刺青師管理 API - 只顯示該分店的刺青師
  @Get('artists')
  async getArtists(@Req() req: any) {
    // 分店經理只能看到自己分店的刺青師
    return this.artistsService.getAllArtists(req.user.role, req.user.branchId);
  }
}
