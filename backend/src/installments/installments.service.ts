import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstallmentDto } from './dto/create-installment.dto';
import { UpdateInstallmentDto } from './dto/update-installment.dto';
import { CreateInstallmentPlanDto } from './dto/create-installment-plan.dto';
import { InstallmentStatus, OrderStatus, PaymentType } from '@prisma/client';

@Injectable()
export class InstallmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 創建分期付款計劃
   */
  async createInstallmentPlan(dto: CreateInstallmentPlanDto) {
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
            status: OrderStatus.PENDING
          }
        });
      } else {
        // 一次付清
        await tx.order.update({
          where: { id: dto.orderId },
          data: {
            isInstallment: false,
            paymentType: PaymentType.ONE_TIME,
            status: OrderStatus.PENDING
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
  async getInstallmentsByOrderId(orderId: string) {
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
  async recordPayment(installmentId: string, paymentData: {
    paymentMethod?: string;
    notes?: string;
    paidAt?: Date;
  }) {
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
      let orderStatus: any = OrderStatus.PENDING;
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
  async updateInstallment(installmentId: string, dto: UpdateInstallmentDto) {
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
  async deleteInstallment(installmentId: string) {
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
  async getOverdueInstallments() {
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
  async markOverdueInstallments() {
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
  async adjustInstallmentAmount(orderId: string, installmentNo: number, newAmount: number, userRole: string) {
    // 檢查權限
    if (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER') {
      throw new BadRequestException('只有 Boss 或分店經理可以調整分期金額');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 獲取訂單和所有分期付款
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

      // 計算未付總額
      const outstanding = order.totalAmount - paidSum;

      // 計算其他固定金額（已付款 + 其他已鎖定且未付款的分期）
      const fixedOthers = order.installments
        .filter(i => i.installmentNo !== installmentNo && 
                    (i.status === InstallmentStatus.PAID || i.isCustom === true))
        .reduce((sum, i) => sum + i.amount, 0);

      // 計算可調整的其他期數（未付款且未鎖定）
      const adjustableInstallments = order.installments.filter(
        i => i.installmentNo !== installmentNo && 
             i.status === InstallmentStatus.UNPAID && 
             i.isCustom !== true
      );

      // 計算剩餘金額
      const remaining = outstanding - newAmount - fixedOthers;

      // 驗證：剩餘金額不能為負數
      if (remaining < 0) {
        const maxAllowed = outstanding - fixedOthers;
        throw new BadRequestException(
          `金額超過可分配上限。本期最大可輸入金額：${maxAllowed} 元，剩餘可分配金額：${outstanding - fixedOthers} 元`
        );
      }

      // 如果沒有其他可調整的分期，直接更新目標分期
      if (adjustableInstallments.length === 0) {
        await tx.installment.update({
          where: { id: targetInstallment.id },
          data: {
            amount: newAmount,
            isCustom: true,
            autoAdjusted: false
          }
        });
      } else {
        // 平均分配剩餘金額
        const each = Math.floor(remaining / adjustableInstallments.length);
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
      const totalSum = updatedInstallments.reduce((sum, i) => sum + i.amount, 0);
      
      if (totalSum !== order.totalAmount) {
        throw new BadRequestException(`計算錯誤：分期總和 ${totalSum} 不等於訂單金額 ${order.totalAmount}`);
      }

      return {
        message: '分期金額調整成功',
        installments: updatedInstallments,
        calculation: {
          totalAmount: order.totalAmount,
          paidSum,
          outstanding,
          fixedOthers,
          remaining,
          adjustableCount: adjustableInstallments.length
        }
      };
    });
  }

  /**
   * 完成訂單結帳（選擇付款方式）
   */
  async completeOrderPayment(orderId: string, paymentData: {
    paymentType: PaymentType;
    installmentTerms?: number;
    startDate?: Date;
    customPlan?: { [key: number]: number };
  }) {
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



