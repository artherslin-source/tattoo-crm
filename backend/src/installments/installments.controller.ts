import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { CreateInstallmentPlanDto } from './dto/create-installment-plan.dto';
import { UpdateInstallmentDto } from './dto/update-installment.dto';
import { AuthGuard } from '@nestjs/passport';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';

@Controller('installments')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  /**
   * 創建分期付款計劃
   */
  @Post('plan')
  async createInstallmentPlan(@Actor() actor: AccessActor, @Body() dto: CreateInstallmentPlanDto) {
    return this.installmentsService.createInstallmentPlan(actor, dto);
  }

  /**
   * 獲取訂單的分期付款記錄
   */
  @Get('order/:orderId')
  async getInstallmentsByOrderId(@Actor() actor: AccessActor, @Param('orderId') orderId: string) {
    return this.installmentsService.getInstallmentsByOrderId(actor, orderId);
  }

  /**
   * 記錄分期付款
   */
  @Post(':installmentId/payment')
  // ARTIST is allowed to record payments within scope; high-risk operations remain BOSS-only.
  async recordPayment(
    @Actor() actor: AccessActor,
    @Param('installmentId') installmentId: string,
    @Body() paymentData: {
      paymentMethod?: string;
      notes?: string;
      paidAt?: string;
    }
  ) {
    return this.installmentsService.recordPayment(actor, installmentId, {
      ...paymentData,
      paidAt: paymentData.paidAt ? new Date(paymentData.paidAt) : undefined
    });
  }

  /**
   * 更新分期付款記錄
   */
  @Put(':installmentId')
  async updateInstallment(
    @Actor() actor: AccessActor,
    @Param('installmentId') installmentId: string,
    @Body() dto: UpdateInstallmentDto
  ) {
    return this.installmentsService.updateInstallment(actor, installmentId, dto);
  }

  /**
   * 刪除分期付款記錄
   */
  @Delete(':installmentId')
  async deleteInstallment(@Actor() actor: AccessActor, @Param('installmentId') installmentId: string) {
    return this.installmentsService.deleteInstallment(actor, installmentId);
  }

  /**
   * 獲取逾期分期付款
   */
  @Get('overdue')
  async getOverdueInstallments(@Actor() actor: AccessActor) {
    return this.installmentsService.getOverdueInstallments(actor);
  }

  /**
   * 標記逾期分期付款
   */
  @Post('mark-overdue')
  async markOverdueInstallments(@Actor() actor: AccessActor) {
    return this.installmentsService.markOverdueInstallments(actor);
  }

  /**
   * 調整分期付款金額（Boss/Manager 專用）
   */
  @Put('order/:orderId/installment/:installmentNo/adjust')
  async adjustInstallmentAmount(
    @Actor() actor: AccessActor,
    @Param('orderId') orderId: string,
    @Param('installmentNo') installmentNo: string,
    @Body() body: { newAmount: number },
    @Request() req: any
  ) {
    return this.installmentsService.adjustInstallmentAmount(
      actor,
      orderId,
      parseInt(installmentNo),
      body.newAmount,
    );
  }

  /**
   * 完成訂單結帳（選擇付款方式）
   */
  @Post('order/:orderId/complete-payment')
  async completeOrderPayment(
    @Actor() actor: AccessActor,
    @Param('orderId') orderId: string,
    @Body() paymentData: {
      paymentType: 'ONE_TIME' | 'INSTALLMENT';
      installmentTerms?: number;
      startDate?: string;
      customPlan?: { [key: number]: number };
    }
  ) {
    return this.installmentsService.completeOrderPayment(actor, orderId, {
      ...paymentData,
      startDate: paymentData.startDate ? new Date(paymentData.startDate) : undefined
    });
  }
}