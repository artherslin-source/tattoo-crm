import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards, BadRequestException, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';
import { BillingService } from './billing.service';
import type { Response } from 'express';

const EnsureBillSchema = z.object({
  appointmentId: z.string().min(1),
});

const RecordPaymentSchema = z.object({
  amount: z.coerce.number().int().refine((v) => v !== 0, 'amount must be non-zero'),
  method: z.string().min(1),
  paidAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const UpdateBillSchema = z.object({
  discountTotal: z.coerce.number().int().min(0).optional(),
  voidReason: z.string().optional(),
  status: z.enum(['OPEN', 'SETTLED', 'VOID']).optional(),
});

const CreateManualBillSchema = z.object({
  branchId: z.string().min(1),
  billType: z.string().min(1).default('WALK_IN'),
  customerId: z.string().optional().nullable(),
  customerNameSnapshot: z.string().optional().nullable(),
  customerPhoneSnapshot: z.string().optional().nullable(),
  artistId: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  discountTotal: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        serviceId: z.string().optional().nullable(),
        nameSnapshot: z.string().min(1),
        basePriceSnapshot: z.coerce.number().int().min(0),
        finalPriceSnapshot: z.coerce.number().int().min(0),
        variantsSnapshot: z.any().optional(),
        notes: z.string().optional().nullable(),
        sortOrder: z.coerce.number().int().optional(),
      }),
    )
    .min(1),
});

const CreateStoredValueTopupSchema = z.object({
  customerId: z.string().min(1),
  amount: z.coerce.number().int().min(1),
  method: z.string().min(1),
  notes: z.string().optional(),
  branchId: z.string().optional(),
});

const RefundToStoredValueSchema = z.object({
  amount: z.coerce.number().int().min(1),
  notes: z.string().optional(),
});

const UpsertSplitRuleSchema = z.object({
  artistId: z.string().min(1),
  branchId: z.string().optional().nullable(),
  artistRateBps: z.coerce.number().int().min(0).max(10000),
  effectiveFrom: z.string().datetime().optional(),
});

const RebuildBillsBatchSchema = z.object({
  appointmentIds: z.array(z.string()).optional(),
});

const RecomputeAllocationsSchema = z.object({
  paymentIds: z.array(z.string()).optional(),
});

const DeleteBillSchema = z.object({
  reason: z.string().min(1),
});

const FullEditBillSchema = z.object({
  bill: z
    .object({
      branchId: z.string().min(1).optional(),
      customerId: z.string().optional().nullable(),
      artistId: z.string().optional().nullable(),
      billType: z.string().min(1).optional(),
      customerNameSnapshot: z.string().optional().nullable(),
      customerPhoneSnapshot: z.string().optional().nullable(),
      discountTotal: z.coerce.number().int().min(0).optional(),
      status: z.enum(['OPEN', 'SETTLED', 'VOID']).optional(),
      voidReason: z.string().optional().nullable(),
    })
    .optional(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        serviceId: z.string().optional().nullable(),
        nameSnapshot: z.string().min(1),
        basePriceSnapshot: z.coerce.number().int().min(0),
        finalPriceSnapshot: z.coerce.number().int().min(0),
        variantsSnapshot: z.any().optional(),
        notes: z.string().optional().nullable(),
        sortOrder: z.coerce.number().int().optional(),
      }),
    )
    .optional(),
  payments: z
    .array(
      z.object({
        id: z.string().optional(),
        amount: z.coerce.number().int(),
        method: z.string().min(1),
        paidAt: z.string().datetime().optional(),
        recordedById: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        allocations: z
          .object({
            artistAmount: z.coerce.number().int(),
            shopAmount: z.coerce.number().int(),
          })
          .optional(),
      }),
    )
    .optional(),
  recomputeAllocations: z.boolean().optional(),
});

@Controller('admin/billing')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class AdminBillingController {
  constructor(private readonly billing: BillingService) {}

  // List bills (with summary fields) for admin page (legacy path)
  @Get('appointments')
  async list(@Actor() actor: AccessActor, @Query() query: any) {
    return this.billing.listBills(actor, {
      branchId: query.branchId,
      artistId: query.artistId,
      customerSearch: query.customerSearch,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  // List bills (preferred)
  @Get('bills')
  async listBills(@Actor() actor: AccessActor, @Query() query: any) {
    return this.billing.listBills(actor, {
      branchId: query.branchId,
      artistId: query.artistId,
      customerSearch: query.customerSearch,
      status: query.status,
      billType: query.billType,
      view: query.view,
      startDate: query.startDate,
      endDate: query.endDate,
      sortField: query.sortField,
      sortOrder: query.sortOrder,
      minBillTotal: query.minBillTotal,
      maxBillTotal: query.maxBillTotal,
      minPaidTotal: query.minPaidTotal,
      maxPaidTotal: query.maxPaidTotal,
      minDueTotal: query.minDueTotal,
      maxDueTotal: query.maxDueTotal,
    });
  }

  // Export bills as .xlsx (BOSS only)
  @Get('bills/export.xlsx')
  async exportBillsXlsx(@Actor() actor: AccessActor, @Query() query: any, @Res() res: Response) {
    const buf = await this.billing.exportBillsXlsx(actor, {
      branchId: query.branchId,
      artistId: query.artistId,
      customerSearch: query.customerSearch,
      status: query.status,
      billType: query.billType,
      view: query.view,
      startDate: query.startDate,
      endDate: query.endDate,
      sortField: query.sortField,
      sortOrder: query.sortOrder,
      minBillTotal: query.minBillTotal,
      maxBillTotal: query.maxBillTotal,
      minPaidTotal: query.minPaidTotal,
      maxPaidTotal: query.maxPaidTotal,
      minDueTotal: query.minDueTotal,
      maxDueTotal: query.maxDueTotal,
    });

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const filename = `billing_${ts}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'no-store');
    // IMPORTANT: use res.send(Buffer) to avoid Nest/Express JSON-serializing Buffer into { type: 'Buffer', data: [...] }
    res.status(200).send(buf);
  }

  // Create non-appointment / manual bill
  @Post('bills')
  async createManualBill(@Actor() actor: AccessActor, @Body() body: unknown) {
    const input = CreateManualBillSchema.parse(body);
    return this.billing.createManualBill(actor, {
      branchId: input.branchId,
      billType: input.billType,
      customerId: input.customerId ?? null,
      customerNameSnapshot: input.customerNameSnapshot ?? null,
      customerPhoneSnapshot: input.customerPhoneSnapshot ?? null,
      artistId: input.artistId ?? null,
      currency: input.currency ?? undefined,
      discountTotal: input.discountTotal,
      notes: input.notes ?? null,
      items: input.items,
    });
  }

  // Stored value top-up (always creates bill + payment)
  @Post('topups')
  async createStoredValueTopup(@Actor() actor: AccessActor, @Body() body: unknown) {
    const input = CreateStoredValueTopupSchema.parse(body);
    return this.billing.createStoredValueTopupBill(actor, {
      customerId: input.customerId,
      amount: input.amount,
      method: input.method,
      notes: input.notes,
      branchId: input.branchId,
    });
  }

  // Refund to stored value balance: creates a topup bill with notes
  @Post('bills/:billId/refund-to-stored-value')
  async refundToStoredValue(@Actor() actor: AccessActor, @Param('billId') billId: string, @Body() body: unknown) {
    const input = RefundToStoredValueSchema.parse(body);
    return this.billing.refundToStoredValue(actor, billId, { amount: input.amount, notes: input.notes });
  }

  // Create / ensure a bill exists for an appointment, based on cartSnapshot (multi-items)
  @Post('appointments/ensure')
  async ensure(@Actor() actor: AccessActor, @Body() body: unknown) {
    const input = EnsureBillSchema.parse(body);
    return this.billing.ensureBillForAppointment(actor, input.appointmentId);
  }

  // Get bill detail by appointment id (legacy path)
  @Get('appointments/:appointmentId')
  async getByAppointment(@Actor() actor: AccessActor, @Param('appointmentId') appointmentId: string) {
    return this.billing.getBillByAppointment(actor, appointmentId);
  }

  // Get bill detail by bill id (preferred)
  @Get('bills/:billId')
  async getById(@Actor() actor: AccessActor, @Param('billId') billId: string) {
    return this.billing.getBillById(actor, billId);
  }

  @Patch('appointments/:appointmentId')
  async update(@Actor() actor: AccessActor, @Param('appointmentId') appointmentId: string, @Body() body: unknown) {
    const input = UpdateBillSchema.parse(body);
    return this.billing.updateBill(actor, appointmentId, {
      discountTotal: input.discountTotal,
      status: input.status,
      voidReason: input.voidReason,
    });
  }

  @Patch('bills/:billId')
  async updateById(@Actor() actor: AccessActor, @Param('billId') billId: string, @Body() body: unknown) {
    const input = UpdateBillSchema.parse(body);
    return this.billing.updateBillById(actor, billId, {
      discountTotal: input.discountTotal,
      status: input.status,
      voidReason: input.voidReason,
    });
  }

  // Full edit (BOSS only): header + items + payments + allocations in one request
  @Put('bills/:billId/full')
  async fullEditById(@Actor() actor: AccessActor, @Param('billId') billId: string, @Body() body: unknown) {
    const input = FullEditBillSchema.parse(body);
    const payments = input.payments?.map((p) => ({
      ...p,
      paidAt: p.paidAt ? new Date(p.paidAt) : undefined,
    }));
    return this.billing.updateBillFull(actor, billId, {
      bill: input.bill,
      items: input.items,
      payments,
      recomputeAllocations: input.recomputeAllocations,
    });
  }

  // Hard delete (BOSS only): removes bill + related rows and reverses side-effects
  @Delete('bills/:billId')
  async deleteBillById(@Actor() actor: AccessActor, @Param('billId') billId: string, @Body() body: unknown) {
    const input = DeleteBillSchema.parse(body);
    return this.billing.deleteBillHard(actor, billId, { reason: input.reason });
  }

  // Record payment / refund
  @Post('appointments/:appointmentId/payments')
  async recordPayment(@Actor() actor: AccessActor, @Param('appointmentId') appointmentId: string, @Body() body: unknown) {
    const input = RecordPaymentSchema.parse(body);
    const paidAt = input.paidAt ? new Date(input.paidAt) : undefined;
    if (paidAt && Number.isNaN(paidAt.getTime())) throw new BadRequestException('paidAt is invalid');
    return this.billing.recordPayment(actor, appointmentId, {
      amount: input.amount,
      method: input.method,
      paidAt,
      notes: input.notes,
    });
  }

  @Post('bills/:billId/payments')
  async recordPaymentByBillId(@Actor() actor: AccessActor, @Param('billId') billId: string, @Body() body: unknown) {
    const input = RecordPaymentSchema.parse(body);
    const paidAt = input.paidAt ? new Date(input.paidAt) : undefined;
    if (paidAt && Number.isNaN(paidAt.getTime())) throw new BadRequestException('paidAt is invalid');
    return this.billing.recordPaymentByBillId(actor, billId, {
      amount: input.amount,
      method: input.method,
      paidAt,
      notes: input.notes,
    });
  }

  // Split rules
  @Get('split-rules')
  async listSplitRules(@Actor() actor: AccessActor, @Query() query: any) {
    return this.billing.listSplitRules(actor, { artistId: query.artistId, branchId: query.branchId });
  }

  @Post('split-rules')
  async upsertSplitRule(@Actor() actor: AccessActor, @Body() body: unknown) {
    const input = UpsertSplitRuleSchema.parse(body);
    return this.billing.upsertSplitRule(actor, {
      artistId: input.artistId,
      branchId: input.branchId ?? null,
      artistRateBps: input.artistRateBps,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : undefined,
    });
  }

  @Delete('split-rules/:artistId')
  async deleteSplitRule(@Actor() actor: AccessActor, @Param('artistId') artistId: string) {
    return this.billing.deleteSplitRule(actor, artistId);
  }

  // Reports (paidAt based)
  @Get('reports')
  async reports(@Actor() actor: AccessActor, @Query() query: any) {
    return this.billing.getReports(actor, {
      branchId: query.branchId,
      artistId: query.artistId,
      view: query.view,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  // Rebuild bill from cartSnapshot (BOSS only)
  @Post('bills/:billId/rebuild-from-cart')
  async rebuildBillFromCart(@Actor() actor: AccessActor, @Param('billId') billId: string) {
    return this.billing.rebuildBillFromCartSnapshot(actor, billId);
  }

  // Batch rebuild bills from cartSnapshot (BOSS only)
  @Post('bills/rebuild-batch')
  async rebuildBillsBatch(@Actor() actor: AccessActor, @Body() body: unknown) {
    const input = RebuildBillsBatchSchema.parse(body);
    return this.billing.rebuildBillsBatch(actor, { appointmentIds: input.appointmentIds });
  }

  // Recompute all payment allocations (BOSS only)
  @Post('payments/recompute-allocations')
  async recomputeAllocations(@Actor() actor: AccessActor, @Body() body: unknown) {
    const input = RecomputeAllocationsSchema.parse(body);
    return this.billing.recomputeAllPaymentAllocations(actor, { paymentIds: input.paymentIds });
  }
}


