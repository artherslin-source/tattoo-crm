import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessActor } from '../common/access/access.types';
import { normalizePhoneDigits } from '../common/utils/phone';

const DONE_KEY = 'prelaunch_reset_done';

@Injectable()
export class PrelaunchService {
  constructor(private readonly prisma: PrismaService) {}

  private requireEnabled() {
    if (process.env.NODE_ENV !== 'production') {
      throw new BadRequestException('Prelaunch reset is only allowed in production');
    }
  }

  private async ensureNotDone() {
    const row = await this.prisma.siteConfig.findUnique({ where: { key: DONE_KEY } });
    if (row?.value && (row.value as any)?.done === true) {
      throw new BadRequestException('Prelaunch reset has already been executed');
    }
  }

  private async markDone(summary: unknown) {
    await this.prisma.siteConfig.upsert({
      where: { key: DONE_KEY },
      create: { key: DONE_KEY, value: { done: true, doneAt: new Date().toISOString(), summary } as any },
      update: { value: { done: true, doneAt: new Date().toISOString(), summary } as any },
    });
  }

  async unlock(_actor: AccessActor, input: { confirm: 'UNLOCK'; secret: string }) {
    this.requireEnabled();

    const expected = process.env.PRELAUNCH_RESET_SECRET;
    if (!expected) throw new BadRequestException('PRELAUNCH_RESET_SECRET is not configured');
    if (input.secret !== expected) throw new ForbiddenException('Invalid secret');

    // Delete the done flag so apply can run again.
    await this.prisma.siteConfig.deleteMany({ where: { key: DONE_KEY } });
    return { ok: true };
  }

  // NOTE: 交付前重置改為「純清空資料」；不再包含刺青師手機/密碼更新或朱川進修復功能。

  async dryRun(_actor: AccessActor) {
    this.requireEnabled();
    const done = await this.prisma.siteConfig.findUnique({ where: { key: DONE_KEY } });
    const doneFlag = !!(done?.value as any)?.done;

    const memberUsers = await this.prisma.user.findMany({ where: { role: 'MEMBER' }, select: { id: true } });
    const memberRows = await this.prisma.member.findMany({ select: { userId: true } });
    const memberUserIds = new Set<string>([...memberUsers.map((u) => u.id), ...memberRows.map((m) => m.userId)]);

    const counts = {
      Notification: await this.prisma.notification.count(),
      PaymentAllocation: await this.prisma.paymentAllocation.count(),
      Payment: await this.prisma.payment.count(),
      AppointmentBillItem: await this.prisma.appointmentBillItem.count(),
      AppointmentBill: await this.prisma.appointmentBill.count(),
      CompletedService: await this.prisma.completedService.count(),
      Appointment: await this.prisma.appointment.count(),
      Contact: await this.prisma.contact.count(),
      CustomerNote: await this.prisma.customerNote.count(),
      CustomerReminder: await this.prisma.customerReminder.count(),
      TopupHistory: await this.prisma.topupHistory.count(),
      Member: await this.prisma.member.count(),
      MemberUsers: memberUserIds.size,
      PortfolioItem: await this.prisma.portfolioItem.count(),
    };

    return {
      done: doneFlag,
      requires: {
        env: { NODE_ENV: process.env.NODE_ENV, PRELAUNCH_RESET_SECRET: !!process.env.PRELAUNCH_RESET_SECRET },
      },
      planned: {
        wipeCounts: counts,
      },
    };
  }

  async apply(_actor: AccessActor, input: { confirm: 'RESET'; secret: string }) {
    this.requireEnabled();
    await this.ensureNotDone();

    const expected = process.env.PRELAUNCH_RESET_SECRET;
    if (!expected) throw new BadRequestException('PRELAUNCH_RESET_SECRET is not configured');
    if (input.secret !== expected) throw new ForbiddenException('Invalid secret');

    // Member users to delete
    const memberUsers = await this.prisma.user.findMany({ where: { role: 'MEMBER' }, select: { id: true } });
    const memberRows = await this.prisma.member.findMany({ select: { userId: true } });
    const memberUserIds = new Set<string>([...memberUsers.map((u) => u.id), ...memberRows.map((m) => m.userId)]);

    const summary = await this.prisma.$transaction(async (tx) => {
      // Wipe business data only
      const del = {
        notification: await tx.notification.deleteMany({}),
        paymentAllocation: await tx.paymentAllocation.deleteMany({}),
        payment: await tx.payment.deleteMany({}),
        billItem: await tx.appointmentBillItem.deleteMany({}),
        bill: await tx.appointmentBill.deleteMany({}),
        completedService: await tx.completedService.deleteMany({}),
        appointment: await tx.appointment.deleteMany({}),
        contact: await tx.contact.deleteMany({}),
        customerNote: await tx.customerNote.deleteMany({}),
        customerReminder: await tx.customerReminder.deleteMany({}),
        topupHistory: await tx.topupHistory.deleteMany({}),
        member: await tx.member.deleteMany({}),
        memberUsers:
          memberUserIds.size > 0 ? await tx.user.deleteMany({ where: { id: { in: Array.from(memberUserIds) } } }) : { count: 0 },
      };

      return {
        deleted: Object.fromEntries(Object.entries(del).map(([k, v]: any) => [k, v.count ?? v])),
      };
    });

    await this.markDone(summary);
    return { ok: true, summary };
  }
}


