import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { InstallmentsService } from './installments.service';

const GenerateSchema = z.object({ count: z.number().int().min(1) });
const MarkPaidSchema = z.object({ paidAt: z.string().datetime().optional(), note: z.string().optional() });

@Controller('installments')
export class InstallmentsController {
  constructor(private readonly installments: InstallmentsService) {}

  @Post('order/:orderId/generate')
  async generate(@Param('orderId') orderId: string, @Body() body: unknown) {
    const { count } = GenerateSchema.parse(body);
    return this.installments.generate(orderId, count);
  }

  @Patch(':id/paid')
  async markPaid(@Param('id') id: string, @Body() body: unknown) {
    const input = MarkPaidSchema.parse(body);
    return this.installments.markPaid(id, input.paidAt ? new Date(input.paidAt) : undefined, input.note);
  }
}



