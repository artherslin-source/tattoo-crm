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
}



