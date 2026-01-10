import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessActor } from '../common/access/access.types';
import bcrypt from 'bcrypt';
import { normalizePhoneDigits } from '../common/utils/phone';

type ArtistPhoneFix = { name: string; phone: string };

const ARTIST_PHONE_FIXES: ArtistPhoneFix[] = [
  { name: '朱川進', phone: '0981927959' },
  { name: '林承葉', phone: '0974320073' },
  { name: '黃晨洋', phone: '0939098588' },
  { name: '陳翔男', phone: '0930828952' },
  { name: '陳震宇', phone: '0937981900' },
];

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

  private async findArtistsByName(name: string) {
    return this.prisma.artist.findMany({
      // name may already include suffix in production (e.g. "（已合併停用）"), so use startsWith for robustness
      where: { OR: [{ displayName: { startsWith: name } }, { user: { name: { startsWith: name } } }] },
      include: { branch: { select: { id: true, name: true } }, user: true },
    });
  }

  private async resolveZhuDonggangSanchong() {
    const hits = await this.findArtistsByName('朱川進');
    const donggang = hits.find((a) => a.branch?.name === '東港店');
    const sanchong = hits.find((a) => a.branch?.name === '三重店');
    if (!donggang || !sanchong) {
      throw new BadRequestException('Could not locate Zhu 東港店/三重店 accounts');
    }
    return { donggang, sanchong };
  }

  private async getZhuFixPlan() {
    const { donggang, sanchong } = await this.resolveZhuDonggangSanchong();
    const donggangBranchId = donggang.branch?.id ?? donggang.user.branchId ?? null;
    const sanchongBranchId = sanchong.branch?.id ?? sanchong.user.branchId ?? null;
    if (!donggangBranchId || !sanchongBranchId) {
      throw new BadRequestException('Zhu branchId missing');
    }

    const link = await this.prisma.artistLoginLink.findFirst({
      where: { loginUserId: donggang.userId, artistUserId: sanchong.userId },
      select: { id: true },
    });
    const accessRows = await this.prisma.artistBranchAccess.findMany({
      where: { userId: donggang.userId },
      select: { branchId: true },
    });
    const accessSet = new Set(accessRows.map((r) => r.branchId));

    const counts = {
      contacts_owner: await this.prisma.contact.count({
        where: { branchId: sanchongBranchId, ownerArtistId: donggang.userId },
      }),
      contacts_preferred: await this.prisma.contact.count({
        where: { branchId: sanchongBranchId, preferredArtistId: donggang.userId },
      }),
      appointments: await this.prisma.appointment.count({
        where: { branchId: sanchongBranchId, artistId: donggang.userId },
      }),
      bills: await this.prisma.appointmentBill.count({
        where: { branchId: sanchongBranchId, artistId: donggang.userId },
      }),
      completedServices: await this.prisma.completedService.count({
        where: { branchId: sanchongBranchId, artistId: donggang.userId },
      }),
    };

    return {
      accounts: {
        donggang: {
          userId: donggang.userId,
          artistId: donggang.id,
          branchId: donggangBranchId,
          branchName: donggang.branch?.name ?? null,
          userName: donggang.user.name ?? null,
          userPhone: donggang.user.phone ?? null,
          userActive: donggang.user.isActive,
          artistActive: donggang.active,
        },
        sanchong: {
          userId: sanchong.userId,
          artistId: sanchong.id,
          branchId: sanchongBranchId,
          branchName: sanchong.branch?.name ?? null,
          userName: sanchong.user.name ?? null,
          userPhone: sanchong.user.phone ?? null,
          userActive: sanchong.user.isActive,
          artistActive: sanchong.active,
        },
      },
      linkExists: !!link,
      access: {
        hasDonggang: accessSet.has(donggangBranchId),
        hasSanchong: accessSet.has(sanchongBranchId),
      },
      moveCounts: counts,
    };
  }

  async dryRun(_actor: AccessActor) {
    this.requireEnabled();
    const done = await this.prisma.siteConfig.findUnique({ where: { key: DONE_KEY } });
    const doneFlag = !!(done?.value as any)?.done;

    const artistMatches: Record<string, any[]> = {};
    for (const fix of ARTIST_PHONE_FIXES) {
      const hits = await this.findArtistsByName(fix.name);
      artistMatches[fix.name] = hits.map((h) => ({
        artistId: h.id,
        userId: h.userId,
        branch: h.branch?.name ?? null,
        active: h.active,
        user: { phone: h.user.phone ?? null, email: h.user.email ?? null, isActive: h.user.isActive, role: h.user.role ?? null },
      }));
    }

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

    let zhu: any = null;
    try {
      zhu = await this.getZhuFixPlan();
    } catch (e) {
      zhu = { error: e instanceof Error ? e.message : String(e) };
    }

    return {
      done: doneFlag,
      requires: {
        env: { NODE_ENV: process.env.NODE_ENV, PRELAUNCH_RESET_SECRET: !!process.env.PRELAUNCH_RESET_SECRET },
      },
      artistMatches,
      planned: {
        artistPhones: ARTIST_PHONE_FIXES.map((x) => ({ name: x.name, phone: normalizePhoneDigits(x.phone) })),
        wipeCounts: counts,
        zhu,
      },
    };
  }

  async apply(_actor: AccessActor, input: { confirm: 'RESET'; secret: string }) {
    this.requireEnabled();
    await this.ensureNotDone();

    const expected = process.env.PRELAUNCH_RESET_SECRET;
    if (!expected) throw new BadRequestException('PRELAUNCH_RESET_SECRET is not configured');
    if (input.secret !== expected) throw new ForbiddenException('Invalid secret');

    const passwordHash = await bcrypt.hash('12345678', 12);

    const { donggang: zhuDonggang, sanchong: zhuSanchong } = await this.resolveZhuDonggangSanchong();

    // Choose accounts for other artists (pick first match; Zhu uses primary only)
    const chosen: Array<{ fix: ArtistPhoneFix; artistId: string; userId: string }> = [];
    for (const fix of ARTIST_PHONE_FIXES) {
      if (fix.name === '朱川進') {
        chosen.push({ fix, artistId: zhuDonggang.id, userId: zhuDonggang.userId });
        continue;
      }
      const hits = await this.findArtistsByName(fix.name);
      if (!hits.length) throw new BadRequestException(`No artist found for ${fix.name}`);
      chosen.push({ fix, artistId: hits[0].id, userId: hits[0].userId });
    }

    // Phone uniqueness check
    for (const c of chosen) {
      const digits = normalizePhoneDigits(c.fix.phone);
      if (!digits) throw new BadRequestException(`Invalid phone digits for ${c.fix.name}`);
      const existing = await this.prisma.user.findUnique({ where: { phone: digits } });
      if (existing && existing.id !== c.userId) {
        throw new BadRequestException(`Phone ${digits} is already in use by another account`);
      }
    }

    // Member users to delete
    const memberUsers = await this.prisma.user.findMany({ where: { role: 'MEMBER' }, select: { id: true } });
    const memberRows = await this.prisma.member.findMany({ select: { userId: true } });
    const memberUserIds = new Set<string>([...memberUsers.map((u) => u.id), ...memberRows.map((m) => m.userId)]);

    const summary = await this.prisma.$transaction(async (tx) => {
      // 1) Zhu cross-branch: keep both identities and link login(東港) -> 三重.
      if (!zhuDonggang.branch?.id || !zhuSanchong.branch?.id) {
        throw new BadRequestException('Zhu branch IDs missing');
      }
      await tx.artistLoginLink.upsert({
        where: { loginUserId_artistUserId: { loginUserId: zhuDonggang.userId, artistUserId: zhuSanchong.userId } } as any,
        create: { loginUserId: zhuDonggang.userId, artistUserId: zhuSanchong.userId },
        update: {},
      });
      await tx.artistBranchAccess.upsert({
        where: { userId_branchId: { userId: zhuDonggang.userId, branchId: zhuDonggang.branch.id } },
        create: { userId: zhuDonggang.userId, branchId: zhuDonggang.branch.id },
        update: {},
      });
      await tx.artistBranchAccess.upsert({
        where: { userId_branchId: { userId: zhuDonggang.userId, branchId: zhuSanchong.branch.id } },
        create: { userId: zhuDonggang.userId, branchId: zhuSanchong.branch.id },
        update: {},
      });
      // Keep secondary identity active but phone must be null (single phone login constraint).
      await tx.user.update({
        where: { id: zhuSanchong.userId },
        data: { isActive: true, phone: null, role: 'ARTIST', name: '朱川進', branchId: zhuSanchong.branch.id },
      });
      await tx.artist.update({
        where: { id: zhuSanchong.id },
        data: { active: true, displayName: '朱川進', branchId: zhuSanchong.branch.id },
      });

      // 2) Update target artists' phones + reset password
      const updatedArtists: any[] = [];
      for (const c of chosen) {
        const digits = normalizePhoneDigits(c.fix.phone)!;
        const u = await tx.user.update({
          where: { id: c.userId },
          data: { phone: digits, hashedPassword: passwordHash, isActive: true, role: 'ARTIST', name: c.fix.name },
          select: { id: true, phone: true, name: true },
        });
        await tx.artist.update({ where: { id: c.artistId }, data: { displayName: c.fix.name, active: true } });
        updatedArtists.push(u);
      }

      // 3) Wipe business data
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
        updatedArtists,
        zhu: { loginUserId: zhuDonggang.userId, linkedUserId: zhuSanchong.userId },
        deleted: Object.fromEntries(Object.entries(del).map(([k, v]: any) => [k, v.count ?? v])),
      };
    });

    await this.markDone(summary);
    return { ok: true, summary };
  }

  // Zhu cross-branch repair (repeatable)
  async zhuFixDryRun(_actor: AccessActor) {
    this.requireEnabled();
    return this.getZhuFixPlan();
  }

  async zhuFixApply(_actor: AccessActor, input: { confirm: 'FIX_ZHU'; secret: string }) {
    this.requireEnabled();
    const expected = process.env.PRELAUNCH_RESET_SECRET;
    if (!expected) throw new BadRequestException('PRELAUNCH_RESET_SECRET is not configured');
    if (input.secret !== expected) throw new ForbiddenException('Invalid secret');

    const plan = await this.getZhuFixPlan();
    const donggang = plan.accounts.donggang;
    const sanchong = plan.accounts.sanchong;

    const res = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: donggang.userId },
        data: { isActive: true, role: 'ARTIST', name: '朱川進' },
      });
      await tx.user.update({
        where: { id: sanchong.userId },
        data: { isActive: true, phone: null, role: 'ARTIST', name: '朱川進', branchId: sanchong.branchId },
      });
      await tx.artist.update({
        where: { id: donggang.artistId },
        data: { active: true, displayName: '朱川進', branchId: donggang.branchId },
      });
      await tx.artist.update({
        where: { id: sanchong.artistId },
        data: { active: true, displayName: '朱川進', branchId: sanchong.branchId },
      });

      await tx.artistLoginLink.upsert({
        where: { loginUserId_artistUserId: { loginUserId: donggang.userId, artistUserId: sanchong.userId } } as any,
        create: { loginUserId: donggang.userId, artistUserId: sanchong.userId },
        update: {},
      });

      await tx.artistBranchAccess.upsert({
        where: { userId_branchId: { userId: donggang.userId, branchId: donggang.branchId } },
        create: { userId: donggang.userId, branchId: donggang.branchId },
        update: {},
      });
      await tx.artistBranchAccess.upsert({
        where: { userId_branchId: { userId: donggang.userId, branchId: sanchong.branchId } },
        create: { userId: donggang.userId, branchId: sanchong.branchId },
        update: {},
      });

      const moved = {
        contacts_owner: await tx.contact.updateMany({
          where: { branchId: sanchong.branchId, ownerArtistId: donggang.userId },
          data: { ownerArtistId: sanchong.userId },
        }),
        contacts_preferred: await tx.contact.updateMany({
          where: { branchId: sanchong.branchId, preferredArtistId: donggang.userId },
          data: { preferredArtistId: sanchong.userId },
        }),
        appointments: await tx.appointment.updateMany({
          where: { branchId: sanchong.branchId, artistId: donggang.userId },
          data: { artistId: sanchong.userId },
        }),
        bills: await tx.appointmentBill.updateMany({
          where: { branchId: sanchong.branchId, artistId: donggang.userId },
          data: { artistId: sanchong.userId },
        }),
        completedServices: await tx.completedService.updateMany({
          where: { branchId: sanchong.branchId, artistId: donggang.userId },
          data: { artistId: sanchong.userId },
        }),
      };

      return { movedCounts: Object.fromEntries(Object.entries(moved).map(([k, v]) => [k, (v as any).count])) };
    });

    return { ok: true, plan, ...res };
  }
}


