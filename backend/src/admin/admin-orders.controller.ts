import { Controller, Get, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrdersService } from '../orders/orders.service';

interface GetOrdersQuery {
  branchId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Controller('admin/orders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(@Query() query: GetOrdersQuery, @Req() req: any) {
    return this.ordersService.getOrders(query, req.user.role, req.user.branchId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }
}
