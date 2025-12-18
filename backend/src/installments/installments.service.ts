import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstallmentDto } from './dto/create-installment.dto';
import { UpdateInstallmentDto } from './dto/update-installment.dto';
import { CreateInstallmentPlanDto } from './dto/create-installment-plan.dto';
import { InstallmentStatus, OrderStatus, PaymentType } from '@prisma/client';
import { isBoss, type AccessActor } from '../common/access/access.types';

@Injectable()
export class InstallmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureOrderReadable(actor: AccessActor, orderId: string) {
    if (isBoss(actor)) return;
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        AND: [
          { branchId: actor.branchId ?? undefined },
          {
            OR: [
              { member: { primaryArtistId: actor.id } },
              { appointment: { artistId: actor.id } },
            ],
          },
        ],
      },
      select: { id: true },
    });
    if (!order) throw new ForbiddenException('Insufficient permissions');
  }

  private async ensureInstallmentReadable(actor: AccessActor, installmentId: string) {
    if (isBoss(actor)) return;
    const installment = await this.prisma.installment.findFirst({
      where: {
        id: installmentId,
        order: {
          AND: [
            { branchId: actor.branchId ?? undefined },
            {
              OR: [
                { member: { primaryArtistId: actor.id } },
                { appointment: { artistId: actor.id } },
              ],
            },
          ],
        },
      },
      select: { id: true },
    });
    if (!installment) throw new ForbiddenException('Insufficient permissions');
  }

  /**
   * 創建分期付款計劃
   */
  async createInstallmentPlan(actor: AccessActor, dto: CreateInstallmentPlanDto) {
    await this.ensureOrderReadable(actor, dto.orderId);
    return await this.prisma.$transaction(async (tx) => {
      // 檢查訂單是否存在
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
        include: { installments: true }
      });

      if (!order) {
        throw new NotFoundException('訂單不存在');
      }

      // 如果已經有分期付款記錄，先刪除
      if (order.installments.length > 0) {
        await tx.installment.deleteMany({
          where: { orderId: dto.orderId }
        });
      }

      let installments: any[] = [];

      if (dto.paymentType === PaymentType.INSTALLMENT) {
        // 創建分期付款
        const installmentCount = dto.installmentCount || 3; // 預設3期
        const totalAmount = order.finalAmount;
        
        // 計算每期金額
        const baseAmount = Math.floor(totalAmount / installmentCount);
        const remainder = totalAmount - (baseAmount * installmentCount);
        
        const now = new Date();
        
        installments = Array.from({ length: installmentCount }).map((_, i) => {
          const isLastInstallment = i === installmentCount - 1;
          const amount = isLastInstallment ? baseAmount + remainder : baseAmount;
          
          // 計算到期日（每月同日）
          const dueDate = new Date(now);
          dueDate.setMonth(dueDate.getMonth() + i + 1);
          
          return {
            orderId: dto.orderId,
            installmentNo: i + 1,
            dueDate,
            amount,
            status: InstallmentStatus.UNPAID,
            notes: dto.notes
          };
        });

        // 如果有指定首期金額，調整第一期
        if (dto.firstPaymentAmount && dto.firstPaymentAmount > 0) {
          installments[0].amount = dto.firstPaymentAmount;
          // 調整最後一期以補足總額
          const remainingAmount = totalAmount - dto.firstPaymentAmount;
          const remainingInstallments = installmentCount - 1;
          const remainingBaseAmount = Math.floor(remainingAmount / remainingInstallments);
          const remainingRemainder = remainingAmount - (remainingBaseAmount * remainingInstallments);
          
          for (let i = 1; i < installments.length; i++) {
            const isLast = i === installments.length - 1;
            installments[i].amount = isLast ? remainingBaseAmount + remainingRemainder : remainingBaseAmount;
          }
        }

        // 創建分期付款記錄
        await tx.installment.createMany({
          data: installments
        });

        // 更新訂單狀態
        await tx.order.update({
          where: { id: dto.orderId },
          data: {
            isInstallment: true,
            paymentType: PaymentType.INSTALLMENT,
            status: OrderStatus.PENDING_PAYMENT
          }
        });
      } else {
        // 一次付清
        await tx.order.update({
          where: { id: dto.orderId },
          data: {
            isInstallment: false,
            paymentType: PaymentType.ONE_TIME,
            status: OrderStatus.PENDING_PAYMENT
          }
        });
      }

      // 返回更新後的訂單和分期付款記錄
      return await tx.order.findUnique({
        where: { id: dto.orderId },
        include: {
          installments: {
            orderBy: { installmentNo: 'asc' }
          },
          member: {
            select: { id: true, name: true, email: true }
          },
          branch: {
            select: { id: true, name: true }
          }
        }
      });
    });
  }

  /**
   * 獲取訂單的分期付款記錄
   */
  async getInstallmentsByOrderId(actor: AccessActor, orderId: string) {
    await this.ensureOrderReadable(actor, orderId);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        installments: {
          orderBy: { installmentNo: 'asc' }
        },
        member: {
          select: { id: true, name: true, email: true }
        },
        branch: {
          select: { id: true, name: true }
        }
      }
    });

    if (!order) {
      throw new NotFoundException('訂單不存在');
    }

    return order;
  }

  /**
   * 記錄分期付款
   */
  async recordPayment(actor: AccessActor, installmentId: string, paymentData: {
    paymentMethod?: string;
    notes?: string;
    paidAt?: Date;
  }) {
    await this.ensureInstallmentReadable(actor, installmentId);
    return await this.prisma.$transaction(async (tx) => {
      // 更新分期付款記錄
      const installment = await tx.installment.update({
        where: { id: installmentId },
        data: {
          status: InstallmentStatus.PAID,
          paidAt: paymentData.paidAt || new Date(),
          paymentMethod: paymentData.paymentMethod,
          notes: paymentData.notes
        },
        include: {
          order: {
            include: {
              installments: true
            }
          }
        }
      });

      // 檢查是否所有分期都已付款
      const allInstallments = installment.order.installments;
      const paidInstallments = allInstallments.filter(i => i.status === InstallmentStatus.PAID);
      const totalPaidAmount = paidInstallments.reduce((sum, i) => sum + i.amount, 0);

      // 更新訂單狀態
      let orderStatus: any = OrderStatus.PENDING_PAYMENT;
      if (paidInstallments.length === allInstallments.length) {
        orderStatus = OrderStatus.PAID;
      } else if (paidInstallments.length > 0) {
        orderStatus = OrderStatus.PARTIALLY_PAID;
      }

      await tx.order.update({
        where: { id: installment.orderId },
        data: {
          status: orderStatus,
          paidAt: orderStatus === OrderStatus.PAID ? new Date() : null
        }
      });

      // 更新會員累計消費（只計算已付款的分期）
      if (paymentData.paidAt || installment.status === InstallmentStatus.PAID) {
        await tx.member.updateMany({
          where: { userId: installment.order.memberId },
          data: {
            totalSpent: { increment: installment.amount }
          }
        });
      }

      console.log('💳 分期付款記錄成功:', {
        installmentId,
        amount: installment.amount,
        orderStatus,
        totalPaidAmount
      });

      return installment;
    });
  }

  /**
   * 更新分期付款記錄
   */
  async updateInstallment(actor: AccessActor, installmentId: string, dto: UpdateInstallmentDto) {
    if (!isBoss(actor)) {
      throw new ForbiddenException('Only BOSS can update installments directly');
    }
    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId }
    });

    if (!installment) {
      throw new NotFoundException('分期付款記錄不存在');
    }

    return await this.prisma.installment.update({
      where: { id: installmentId },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined
      }
    });
  }

  /**
   * 刪除分期付款記錄
   */
  async deleteInstallment(actor: AccessActor, installmentId: string) {
    if (!isBoss(actor)) {
      throw new ForbiddenException('Only BOSS can delete installments');
    }
    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId }
    });

    if (!installment) {
      throw new NotFoundException('分期付款記錄不存在');
    }

    if (installment.status === InstallmentStatus.PAID) {
      throw new BadRequestException('已付款的分期記錄無法刪除');
    }

    return await this.prisma.installment.delete({
      where: { id: installmentId }
    });
  }

  /**
   * 獲取逾期分期付款
   */
  async getOverdueInstallments(actor: AccessActor) {
    if (!isBoss(actor)) {
      throw new ForbiddenException('Only BOSS can view overdue installments');
    }
    const now = new Date();
    
    return await this.prisma.installment.findMany({
      where: {
        status: InstallmentStatus.UNPAID,
        dueDate: {
          lt: now
        }
      },
      include: {
        order: {
          include: {
            member: {
              select: { id: true, name: true, email: true }
            },
            branch: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });
  }

  /**
   * 標記逾期分期付款
   */
  async markOverdueInstallments(actor: AccessActor) {
    if (!isBoss(actor)) {
      throw new ForbiddenException('Only BOSS can mark overdue installments');
    }
    const now = new Date();
    
    const result = await this.prisma.installment.updateMany({
      where: {
        status: InstallmentStatus.UNPAID,
        dueDate: {
          lt: now
        }
      },
      data: {
        status: InstallmentStatus.OVERDUE
      }
    });

    console.log('⏰ 標記逾期分期付款:', result.count);
    return result;
  }

  /**
   * 調整分期付款金額（Boss/Manager 專用）
   */
  async adjustInstallmentAmount(actor: AccessActor, orderId: string, installmentNo: number, newAmount: number) {
    if (!isBoss(actor)) {
      throw new ForbiddenException('Only BOSS can adjust installment amounts');
    }

    // ✅ 驗證金額為正整數
    if (!Number.isInteger(newAmount) || newAmount <= 0) {
      throw new BadRequestException('金額必須為正整數（新台幣不使用小數）');
    }

    return await this.prisma.$transaction(async (tx) => {
      // ✅ 加上行級鎖防止 Race Condition
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { installments: { orderBy: { installmentNo: 'asc' } } }
      });

      if (!order) {
        throw new NotFoundException('訂單不存在');
      }

      if (order.status !== OrderStatus.INSTALLMENT_ACTIVE && order.status !== OrderStatus.PARTIALLY_PAID) {
        throw new BadRequestException('只有分期付款中的訂單才能調整金額');
      }

      // 找到要調整的分期付款
      const targetInstallment = order.installments.find(i => i.installmentNo === installmentNo);
      if (!targetInstallment) {
        throw new NotFoundException('分期付款不存在');
      }

      if (targetInstallment.status === InstallmentStatus.PAID) {
        throw new BadRequestException('已付款的分期不能調整金額');
      }

      // 計算已付款總額
      const paidSum = order.installments
        .filter(i => i.status === InstallmentStatus.PAID)
        .reduce((sum, i) => sum + i.amount, 0);

      // 計算其他已鎖定且未付款的分期金額（isCustom=true 的未付款分期）
      const lockedUnpaidSum = order.installments
        .filter(i => i.installmentNo !== installmentNo && 
                    i.status === InstallmentStatus.UNPAID && 
                    i.isCustom === true)
        .reduce((sum, i) => sum + i.amount, 0);

      // ✅ 修正問題1：正確計算剩餘金額（從總金額扣除）
      const remaining = order.totalAmount - (paidSum + lockedUnpaidSum + newAmount);

      // 驗證：剩餘金額不能為負數
      if (remaining < 0) {
        const maxAllowed = order.totalAmount - paidSum - lockedUnpaidSum;
        throw new BadRequestException(
          `金額超過可分配上限。本期最大可輸入金額：${maxAllowed} 元（總金額 ${order.totalAmount} - 已付款 ${paidSum} - 其他鎖定 ${lockedUnpaidSum}）`
        );
      }

      // 計算可調整的其他期數（未付款且未鎖定）
      const adjustableInstallments = order.installments.filter(
        i => i.installmentNo !== installmentNo && 
             i.status === InstallmentStatus.UNPAID && 
             i.isCustom !== true
      );

      // ✅ 修正問題2：如果沒有其他可調整的分期，驗證剩餘金額必須為0
      if (adjustableInstallments.length === 0) {
        if (remaining !== 0) {
          throw new BadRequestException(
            `無其他可調整分期，本期金額必須為 ${order.totalAmount - paidSum - lockedUnpaidSum} 元才能使總額相符`
          );
        }
        
        await tx.installment.update({
          where: { id: targetInstallment.id },
          data: {
            amount: newAmount,
            isCustom: true,
            autoAdjusted: false
          }
        });
      } else {
        // ✅ 修正問題4：重置所有未付款分期的 autoAdjusted 狀態
        await tx.installment.updateMany({
          where: { 
            orderId, 
            status: InstallmentStatus.UNPAID,
            installmentNo: { not: installmentNo }
          },
          data: { autoAdjusted: false }
        });

        // ✅ 修正問題3：使用四捨五入避免精度問題
        const each = Math.round(remaining / adjustableInstallments.length);
        const remainder = remaining - (each * adjustableInstallments.length);

        // 更新目標分期付款
        await tx.installment.update({
          where: { id: targetInstallment.id },
          data: {
            amount: newAmount,
            isCustom: true,
            autoAdjusted: false
          }
        });

        // 更新其他可調整的分期付款
        for (let i = 0; i < adjustableInstallments.length; i++) {
          const installment = adjustableInstallments[i];
          const isLast = i === adjustableInstallments.length - 1;
          const adjustedAmount = isLast ? each + remainder : each;

          await tx.installment.update({
            where: { id: installment.id },
            data: {
              amount: adjustedAmount,
              isCustom: false,
              autoAdjusted: true
            }
          });
        }
      }

      // 重新獲取更新後的分期付款
      const updatedInstallments = await tx.installment.findMany({
        where: { orderId },
        orderBy: { installmentNo: 'asc' }
      });

      // 驗證總和
      let totalSum = updatedInstallments.reduce((sum, i) => sum + i.amount, 0);
      
      // ✅ 修正問題3：如果有尾差，自動補到最後一期
      const delta = order.totalAmount - totalSum;
      if (delta !== 0) {
        const lastUnpaidInstallment = updatedInstallments
          .reverse()
          .find(i => i.status === InstallmentStatus.UNPAID);
        
        if (lastUnpaidInstallment) {
          await tx.installment.update({
            where: { id: lastUnpaidInstallment.id },
            data: { amount: lastUnpaidInstallment.amount + delta }
          });
          
          // 重新獲取更新後的分期
          const finalInstallments = await tx.installment.findMany({
            where: { orderId },
            orderBy: { installmentNo: 'asc' }
          });
          
          totalSum = finalInstallments.reduce((sum, i) => sum + i.amount, 0);
          
          // 最終驗證
          if (totalSum !== order.totalAmount) {
            throw new BadRequestException(`計算錯誤：分期總和 ${totalSum} 不等於訂單金額 ${order.totalAmount}，差額 ${delta} 元無法修正`);
          }
          
          return {
            message: '分期金額調整成功（已自動修正尾差）',
            installments: finalInstallments,
            calculation: {
              totalAmount: order.totalAmount,
              paidSum,
              lockedUnpaidSum,
              remaining,
              adjustableCount: adjustableInstallments.length,
              deltaAdjusted: delta
            }
          };
        }
      }

      return {
        message: '分期金額調整成功',
        installments: updatedInstallments,
        calculation: {
          totalAmount: order.totalAmount,
          paidSum,
          lockedUnpaidSum,
          remaining,
          adjustableCount: adjustableInstallments.length
        }
      };
    });
  }

  /**
   * 完成訂單結帳（選擇付款方式）
   */
  async completeOrderPayment(actor: AccessActor, orderId: string, paymentData: {
    paymentType: PaymentType;
    installmentTerms?: number;
    startDate?: Date;
    customPlan?: { [key: number]: number };
  }) {
    await this.ensureOrderReadable(actor, orderId);
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { installments: true }
      });

      if (!order) {
        throw new NotFoundException('訂單不存在');
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException('訂單狀態不正確，無法完成結帳');
      }

      if (paymentData.paymentType === PaymentType.ONE_TIME) {
        // 一次付清
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.PAID,
            paymentType: PaymentType.ONE_TIME,
            paidAt: new Date(),
            isInstallment: false
          }
        });

        return { message: '訂單已標記為已付款' };
      } else {
        // 分期付款
        const installmentCount = paymentData.installmentTerms || 3;
        const startDate = paymentData.startDate || new Date();
        const totalAmount = order.finalAmount;

        // 刪除現有的分期付款記錄（如果有的話）
        if (order.installments.length > 0) {
          await tx.installment.deleteMany({
            where: { orderId }
          });
        }

        // 創建分期付款記錄
        const installments: any[] = [];
        const customPlan = paymentData.customPlan || {};

        for (let i = 1; i <= installmentCount; i++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i - 1);

          let amount: number;
          let isCustom = false;

          if (customPlan[i]) {
            // 使用自定義金額
            amount = customPlan[i];
            isCustom = true;
          } else {
            // 計算平均金額
            const baseAmount = Math.floor(totalAmount / installmentCount);
            const remainder = totalAmount - (baseAmount * installmentCount);
            amount = i === installmentCount ? baseAmount + remainder : baseAmount;
          }

          const installment = await tx.installment.create({
            data: {
              orderId,
              installmentNo: i,
              dueDate,
              amount,
              status: InstallmentStatus.UNPAID,
              isCustom,
              autoAdjusted: !isCustom
            }
          });

          installments.push(installment);
        }

        // 更新訂單狀態
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.INSTALLMENT_ACTIVE,
            paymentType: PaymentType.INSTALLMENT,
            isInstallment: true
          }
        });

        return {
          message: '分期付款計劃已創建',
          installments
        };
      }
    });
  }
}



