import { Controller, Get, Patch, Param, Body, Query, UseGuards, Req, Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrdersService } from '../orders/orders.service';
import { z } from 'zod';

interface GetOrdersQuery {
  branchId?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

const CreateOrderSchema = z.object({
  memberId: z.string().min(1),
  branchId: z.string().min(1),
  totalAmount: z.number().int().min(0),
  notes: z.string().optional(),
});

@Controller('admin/orders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(@Query() query: GetOrdersQuery, @Req() req: any) {
    console.log('🎯 AdminOrdersController.findAll called');
    console.log('🔍 Query params:', query);
    try {
      // 確保 page 和 limit 是數字
      const processedQuery = {
        ...query,
        page: query.page ? parseInt(query.page.toString()) : 1,
        limit: query.limit ? parseInt(query.limit.toString()) : 10,
      };
      console.log('🔍 Processed query:', processedQuery);
      return this.ordersService.getOrders(processedQuery, req.user.role, req.user.branchId);
    } catch (error) {
      console.error('❌ Error in AdminOrdersController.findAll:', error);
      throw error;
    }
  }

  /** ✅ 新增：彙總統計，不分頁 */
  @Get('summary')
  async summary(@Query() query: GetOrdersQuery, @Req() req: any) {
    console.log('🎯 AdminOrdersController.summary called');
    console.log('🔍 Query params:', query);
    try {
      return this.ordersService.getOrdersSummary(query, req.user.role, req.user.branchId);
    } catch (error) {
      console.error('❌ Error in AdminOrdersController.summary:', error);
      throw error;
    }
  }

  @Post()
  async create(@Body() body: unknown) {
    console.log('🎯 AdminOrdersController.create called');
    console.log('🔍 Request body:', body);
    try {
      const input = CreateOrderSchema.parse(body);
      return this.ordersService.create({
        memberId: input.memberId,
        branchId: input.branchId,
        appointmentId: null,
        totalAmount: input.totalAmount,
        useStoredValue: false,
        notes: input.notes,
      });
    } catch (error) {
      console.error('❌ Error in AdminOrdersController.create:', error);
      throw error;
    }
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
