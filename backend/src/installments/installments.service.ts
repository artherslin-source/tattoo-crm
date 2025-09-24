import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstallmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(orderId: string, count: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    if (count <= 0) throw new Error('Invalid count');
    const per = Math.floor(order.totalAmount / count);
    const remainder = order.totalAmount - per * count;
    const now = new Date();

    const installments = Array.from({ length: count }).map((_, i) => ({
      orderId,
      installmentNo: i + 1,
      dueDate: new Date(now.getFullYear(), now.getMonth() + i + 1, 1),
      amount: per + (i === count - 1 ? remainder : 0),
    }));

    await this.prisma.installment.createMany({ data: installments });
    return this.prisma.installment.findMany({ where: { orderId }, orderBy: { installmentNo: 'asc' } });
  }

  async markPaid(installmentId: string, paidAt?: Date, note?: string) {
    return this.prisma.installment.update({
      where: { id: installmentId },
      data: { status: 'PAID', paidAt: paidAt ?? new Date(), note: note ?? null },
    });
  }
}



