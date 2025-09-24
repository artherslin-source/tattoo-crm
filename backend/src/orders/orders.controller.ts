import { Body, Controller, Post, Get, Req, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { OrdersService } from './orders.service';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { BranchGuard } from '../common/guards/branch.guard';

const CreateOrderSchema = z.object({
  branchId: z.string().min(1),
  appointmentId: z.string().optional(),
  totalAmount: z.number().int().min(0),
  paymentType: z.enum(['ONE_TIME', 'INSTALLMENT']),
});

interface GetOrdersQuery {
  branchId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@UseGuards(AuthGuard('jwt'), BranchGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  findAll() {
    return { message: 'Orders API OK' };
  }

  @Post()
  async create(@Req() req: any, @Body() body: unknown) {
    const input = CreateOrderSchema.parse(body);
    return this.orders.create({
      memberId: req.user.userId,
      branchId: input.branchId,
      appointmentId: input.appointmentId ?? null,
      totalAmount: input.totalAmount,
      paymentType: input.paymentType,
    });
  }

  @Get('my')
  async myOrders(@Req() req: any) {
    return this.orders.myOrders(req.user.userId);
  }

  @Get('list')
  @UseGuards(RolesGuard)
  @Roles('BOSS', 'BRANCH_MANAGER')
  async getOrders(@Query() query: GetOrdersQuery, @Req() req: any) {
    return this.orders.getOrders(query, req.user.role, req.user.branchId);
  }
}



