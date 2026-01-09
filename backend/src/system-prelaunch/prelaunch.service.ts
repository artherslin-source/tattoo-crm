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
      where: { OR: [{ displayName: name }, { user: { name } }] },
      include: { branch: { select: { id: true, name: true } }, user: true },
    });
  }

  private async resolveZhuPrimarySecondary() {
    const hits = await this.findArtistsByName('朱川進');
    if (hits.length < 2) {
      throw new BadRequestException('Expected two Zhu accounts (東港/三重) but did not find both');
    }
    const donggang = hits.find((a) => a.branch?.name === '東港店');
    const sanchong = hits.find((a) => a.branch?.name === '三重店');
    if (!donggang || !sanchong) {
      throw new BadRequestException('Could not locate Zhu 東港店/三重店 accounts');
    }
    return { primary: donggang, secondary: sanchong };
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
      const { primary, secondary } = await this.resolveZhuPrimarySecondary();
      zhu = {
        primary: { userId: primary.userId, artistId: primary.id, branch: primary.branch?.name ?? null, email: primary.user.email ?? null, phone: primary.user.phone ?? null },
        secondary: { userId: secondary.userId, artistId: secondary.id, branch: secondary.branch?.name ?? null, email: secondary.user.email ?? null, phone: secondary.user.phone ?? null },
      };
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

    const { primary: zhuPrimary, secondary: zhuSecondary } = await this.resolveZhuPrimarySecondary();

    // Choose accounts for other artists (pick first match; Zhu uses primary only)
    const chosen: Array<{ fix: ArtistPhoneFix; artistId: string; userId: string }> = [];
    for (const fix of ARTIST_PHONE_FIXES) {
      if (fix.name === '朱川進') {
        chosen.push({ fix, artistId: zhuPrimary.id, userId: zhuPrimary.userId });
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
      // 1) Zhu merge (secondary -> primary) for non-wiped config/content tables
      // Portfolio items should be preserved and merged.
      await tx.portfolioItem.updateMany({
        where: { artistId: zhuSecondary.userId },
        data: { artistId: zhuPrimary.userId },
      });
      // Artist split rules should be preserved.
      await tx.artistSplitRule.updateMany({
        where: { artistId: zhuSecondary.userId },
        data: { artistId: zhuPrimary.userId },
      });
      // Payments recordedBy / createdBy (if any) — preserve attribution under primary
      await tx.payment.updateMany({
        where: { recordedById: zhuSecondary.userId },
        data: { recordedById: zhuPrimary.userId },
      });
      await tx.appointmentBill.updateMany({
        where: { createdById: zhuSecondary.userId },
        data: { createdById: zhuPrimary.userId },
      });
      await tx.user.updateMany({
        where: { primaryArtistId: zhuSecondary.userId },
        data: { primaryArtistId: zhuPrimary.userId },
      });
      await tx.contact.updateMany({
        where: { ownerArtistId: zhuSecondary.userId },
        data: { ownerArtistId: zhuPrimary.userId },
      });
      await tx.contact.updateMany({
        where: { preferredArtistId: zhuSecondary.userId },
        data: { preferredArtistId: zhuPrimary.userId },
      });

      // Merge availability from secondary Artist model into primary Artist model (best-effort)
      const secondaryAvail = await tx.artistAvailability.findMany({ where: { artistId: zhuSecondary.id } });
      for (const a of secondaryAvail) {
        // avoid duplicates by exact match
        const exists = await tx.artistAvailability.findFirst({
          where: {
            artistId: zhuPrimary.id,
            weekday: a.weekday,
            specificDate: a.specificDate,
            startTime: a.startTime,
            endTime: a.endTime,
            isBlocked: a.isBlocked,
            repeatRule: a.repeatRule,
          },
          select: { id: true },
        });
        if (!exists) {
          await tx.artistAvailability.create({
            data: {
              artistId: zhuPrimary.id,
              weekday: a.weekday,
              specificDate: a.specificDate,
              startTime: a.startTime,
              endTime: a.endTime,
              isBlocked: a.isBlocked,
              repeatRule: a.repeatRule,
            },
          });
        }
      }

      // Ensure ArtistBranchAccess entries for Zhu primary: 東港 + 三重
      if (!zhuPrimary.branch?.id || !zhuSecondary.branch?.id) {
        throw new BadRequestException('Zhu branch IDs missing');
      }
      await tx.artistBranchAccess.upsert({
        where: { userId_branchId: { userId: zhuPrimary.userId, branchId: zhuPrimary.branch.id } },
        create: { userId: zhuPrimary.userId, branchId: zhuPrimary.branch.id },
        update: {},
      });
      await tx.artistBranchAccess.upsert({
        where: { userId_branchId: { userId: zhuPrimary.userId, branchId: zhuSecondary.branch.id } },
        create: { userId: zhuPrimary.userId, branchId: zhuSecondary.branch.id },
        update: {},
      });

      // Deactivate Zhu secondary user + artist
      await tx.user.update({
        where: { id: zhuSecondary.userId },
        data: { isActive: false, phone: null, name: '朱川進（已合併停用）' },
      });
      await tx.artist.update({
        where: { id: zhuSecondary.id },
        data: { active: false, displayName: '朱川進（已合併停用）' },
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
        zhu: { primaryUserId: zhuPrimary.userId, secondaryUserId: zhuSecondary.userId },
        deleted: Object.fromEntries(Object.entries(del).map(([k, v]: any) => [k, v.count ?? v])),
      };
    });

    await this.markDone(summary);
    return { ok: true, summary };
  }
}


