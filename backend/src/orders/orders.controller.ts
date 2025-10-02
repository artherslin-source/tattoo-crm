import { Body, Controller, Post, Get, Req, UseGuards, Query, Param, Put } from '@nestjs/common';
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
  useStoredValue: z.boolean().optional(),
});

const CheckoutOrderSchema = z.object({
  paymentType: z.enum(['ONE_TIME', 'INSTALLMENT']),
  installmentTerms: z.number().int().min(2).max(12).optional(),
  startDate: z.string().optional(),
  customPlan: z.record(z.string(), z.number()).optional(),
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
      memberId: req.user.id,
      branchId: input.branchId,
      appointmentId: input.appointmentId ?? null,
      totalAmount: input.totalAmount,
      useStoredValue: input.useStoredValue ?? false,
    });
  }

  @Put(':id/checkout')
  @Roles('BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN')
  async checkout(@Param('id') orderId: string, @Body() body: unknown) {
    const input = CheckoutOrderSchema.parse(body);
    return this.orders.checkout(orderId, {
      paymentType: input.paymentType,
      installmentTerms: input.installmentTerms,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      customPlan: input.customPlan,
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



