import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { CreateInstallmentPlanDto } from './dto/create-installment-plan.dto';
import { UpdateInstallmentDto } from './dto/update-installment.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('installments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  /**
   * 創建分期付款計劃
   */
  @Post('plan')
  @Roles('BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN')
  async createInstallmentPlan(@Body() dto: CreateInstallmentPlanDto) {
    return this.installmentsService.createInstallmentPlan(dto);
  }

  /**
   * 獲取訂單的分期付款記錄
   */
  @Get('order/:orderId')
  @Roles('BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN')
  async getInstallmentsByOrderId(@Param('orderId') orderId: string) {
    return this.installmentsService.getInstallmentsByOrderId(orderId);
  }

  /**
   * 記錄分期付款
   */
  @Post(':installmentId/payment')
  @Roles('BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN')
  async recordPayment(
    @Param('installmentId') installmentId: string,
    @Body() paymentData: {
      paymentMethod?: string;
      notes?: string;
      paidAt?: string;
    }
  ) {
    return this.installmentsService.recordPayment(installmentId, {
      ...paymentData,
      paidAt: paymentData.paidAt ? new Date(paymentData.paidAt) : undefined
    });
  }

  /**
   * 更新分期付款記錄
   */
  @Put(':installmentId')
  @Roles('BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN')
  async updateInstallment(
    @Param('installmentId') installmentId: string,
    @Body() dto: UpdateInstallmentDto
  ) {
    return this.installmentsService.updateInstallment(installmentId, dto);
  }

  /**
   * 刪除分期付款記錄
   */
  @Delete(':installmentId')
  @Roles('BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN')
  async deleteInstallment(@Param('installmentId') installmentId: string) {
    return this.installmentsService.deleteInstallment(installmentId);
  }

  /**
   * 獲取逾期分期付款
   */
  @Get('overdue')
  @Roles('BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN')
  async getOverdueInstallments() {
    return this.installmentsService.getOverdueInstallments();
  }

  /**
   * 標記逾期分期付款
   */
  @Post('mark-overdue')
  @Roles('BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN')
  async markOverdueInstallments() {
    return this.installmentsService.markOverdueInstallments();
  }

  /**
   * 調整分期付款金額（Boss/Manager 專用）
   */
  @Put('order/:orderId/installment/:installmentNo/adjust')
  @Roles('BOSS', 'BRANCH_MANAGER')
  async adjustInstallmentAmount(
    @Param('orderId') orderId: string,
    @Param('installmentNo') installmentNo: string,
    @Body() body: { newAmount: number },
    @Request() req: any
  ) {
    const userRole = req.user.role;
    return this.installmentsService.adjustInstallmentAmount(
      orderId,
      parseInt(installmentNo),
      body.newAmount,
      userRole
    );
  }

  /**
   * 完成訂單結帳（選擇付款方式）
   */
  @Post('order/:orderId/complete-payment')
  @Roles('BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN')
  async completeOrderPayment(
    @Param('orderId') orderId: string,
    @Body() paymentData: {
      paymentType: 'ONE_TIME' | 'INSTALLMENT';
      installmentTerms?: number;
      startDate?: string;
      customPlan?: { [key: number]: number };
    }
  ) {
    return this.installmentsService.completeOrderPayment(orderId, {
      ...paymentData,
      startDate: paymentData.startDate ? new Date(paymentData.startDate) : undefined
    });
  }
}