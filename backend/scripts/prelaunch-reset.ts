import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { normalizePhoneDigits } from '../src/common/utils/phone';

/**
 * Pre-launch reset script (production only).
 *
 * What it does:
 * - Update specified ARTIST users' phone numbers (unique) and reset their password to 12345678
 * - Wipe pre-launch business data: members/contacts/appointments/billing/notifications
 * - Delete all MEMBER users (and related Member rows)
 *
 * Safety rails:
 * - NODE_ENV must be "production"
 * - ALLOW_PRELAUNCH_RESET must be "true"
 * - DRY_RUN=1 prints actions, APPLY=1 performs changes
 */

const prisma = new PrismaClient();

type ArtistPhoneFix = { name: string; phone: string };

const ARTIST_PHONE_FIXES: ArtistPhoneFix[] = [
  { name: '朱川進', phone: '0981927959' },
  { name: '林承葉', phone: '0974320073' },
  { name: '黃晨洋', phone: '0939098588' },
  { name: '陳翔男', phone: '0930828952' },
  { name: '陳震宇', phone: '0937981900' },
];

function must(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(msg);
}

function envFlag(name: string): boolean {
  const v = process.env[name];
  return v === '1' || v === 'true' || v === 'TRUE' || v === 'yes' || v === 'YES';
}

async function main() {
  const isProd = process.env.NODE_ENV === 'production';
  const allow = process.env.ALLOW_PRELAUNCH_RESET === 'true';
  const dryRun = envFlag('DRY_RUN');
  const apply = envFlag('APPLY');

  must(isProd, `Refusing to run: NODE_ENV must be "production" (got "${process.env.NODE_ENV}")`);
  must(allow, 'Refusing to run: set ALLOW_PRELAUNCH_RESET=true to proceed');
  must(dryRun || apply, 'Set DRY_RUN=1 (preview) or APPLY=1 (execute)');
  must(!(dryRun && apply), 'Use either DRY_RUN=1 or APPLY=1, not both');

  console.log('=== Prelaunch Reset ===');
  console.log('mode:', dryRun ? 'DRY_RUN' : 'APPLY');

  // 1) Locate target artists
  const nameSet = Array.from(new Set(ARTIST_PHONE_FIXES.map((a) => a.name)));
  const artists = await prisma.artist.findMany({
    where: {
      OR: [{ displayName: { in: nameSet } }, { user: { name: { in: nameSet } } }],
    },
    include: { branch: { select: { id: true, name: true } }, user: true },
  });

  const byName = new Map<string, typeof artists>();
  for (const a of artists) {
    const n = a.displayName || a.user.name || '';
    if (!n) continue;
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n)!.push(a);
  }

  console.log('\n-- Artist matches --');
  for (const fix of ARTIST_PHONE_FIXES) {
    const hits = (byName.get(fix.name) || []).slice().sort((a, b) => {
      const aActive = a.active ? 1 : 0;
      const bActive = b.active ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    console.log(`* ${fix.name}: ${hits.length} match(es)`);
    for (const h of hits) {
      console.log(
        `  - artistId=${h.id} userId=${h.userId} branch=${h.branch?.name ?? '-'} active=${h.active} user.phone=${h.user.phone ?? '-'} user.email=${h.user.email ?? '-'}`,
      );
    }
  }

  // Safety: if any name matches 0, abort. If any matches >1, require explicit override.
  const allowDuplicateNames = process.env.ALLOW_DUPLICATE_ARTIST_NAMES === 'true';
  for (const fix of ARTIST_PHONE_FIXES) {
    const hits = (byName.get(fix.name) || []);
    must(hits.length > 0, `No artist found for name "${fix.name}". Abort.`);
    if (hits.length > 1) {
      must(
        allowDuplicateNames,
        `Multiple artists found for "${fix.name}". Set ALLOW_DUPLICATE_ARTIST_NAMES=true to proceed (will pick the first active/oldest).`,
      );
    }
  }

  const chosen = ARTIST_PHONE_FIXES.map((fix) => {
    const hits = (byName.get(fix.name) || []).slice().sort((a, b) => {
      const aActive = a.active ? 1 : 0;
      const bActive = b.active ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    return { fix, artist: hits[0] };
  });

  // Validate phone uniqueness upfront (including existing users)
  for (const { fix } of chosen) {
    const digits = normalizePhoneDigits(fix.phone);
    must(!!digits, `Invalid phone digits for ${fix.name}: "${fix.phone}"`);
    const existing = await prisma.user.findUnique({ where: { phone: digits } });
    if (existing) {
      // Allow if it's the same user we are updating
      const intendedUserIds = chosen.map((x) => x.artist.userId);
      must(
        intendedUserIds.includes(existing.id),
        `Phone ${digits} already in use by userId=${existing.id}. Resolve conflict before proceeding.`,
      );
    }
  }

  const passwordPlain = '12345678';
  const passwordHash = await bcrypt.hash(passwordPlain, 12);

  // 2) Compute delete counts
  const memberUsers = await prisma.user.findMany({
    where: { role: 'MEMBER' },
    select: { id: true, phone: true, email: true, name: true },
  });
  const memberRows = await prisma.member.findMany({ select: { id: true, userId: true } });
  const memberUserIds = new Set<string>([
    ...memberUsers.map((u) => u.id),
    ...memberRows.map((m) => m.userId),
  ]);

  const counts = {
    Notification: await prisma.notification.count(),
    PaymentAllocation: await prisma.paymentAllocation.count(),
    Payment: await prisma.payment.count(),
    AppointmentBillItem: await prisma.appointmentBillItem.count(),
    AppointmentBill: await prisma.appointmentBill.count(),
    CompletedService: await prisma.completedService.count(),
    Appointment: await prisma.appointment.count(),
    Contact: await prisma.contact.count(),
    CustomerNote: await prisma.customerNote.count(),
    CustomerReminder: await prisma.customerReminder.count(),
    TopupHistory: await prisma.topupHistory.count(),
    Member: await prisma.member.count(),
    MemberUsers: memberUserIds.size,
  };

  console.log('\n-- Planned changes --');
  console.log('Artists to update (phone + password=12345678):');
  for (const { fix, artist } of chosen) {
    const digits = normalizePhoneDigits(fix.phone)!;
    console.log(
      `- ${fix.name}: userId=${artist.userId} artistId=${artist.id} branch=${artist.branch?.name ?? '-'} -> phone=${digits}`,
    );
  }
  console.log('\nDelete counts:');
  console.table(counts);

  if (dryRun) {
    console.log('\nDRY_RUN only. No changes applied.');
    return;
  }

  // 3) Apply changes (ordered deletes to satisfy FK constraints)
  console.log('\n=== APPLY ===');

  await prisma.$transaction(async (tx) => {
    // (A) Update artist phones + reset password hash
    for (const { fix, artist } of chosen) {
      const digits = normalizePhoneDigits(fix.phone)!;
      await tx.user.update({
        where: { id: artist.userId },
        data: {
          phone: digits,
          hashedPassword: passwordHash,
          isActive: true,
          role: 'ARTIST',
          name: fix.name,
        },
      });
      // Ensure displayName is consistent
      await tx.artist.update({
        where: { id: artist.id },
        data: { displayName: fix.name, active: true },
      });
    }

    // (B) Wipe business data (global)
    await tx.notification.deleteMany({});

    // Billing v3
    await tx.paymentAllocation.deleteMany({});
    await tx.payment.deleteMany({});
    await tx.appointmentBillItem.deleteMany({});
    await tx.appointmentBill.deleteMany({});

    // Appointments + completed services
    await tx.completedService.deleteMany({});
    await tx.appointment.deleteMany({});

    // Contacts
    await tx.contact.deleteMany({});

    // Member-related side tables (needed before deleting member users)
    await tx.customerNote.deleteMany({});
    await tx.customerReminder.deleteMany({});
    await tx.topupHistory.deleteMany({});
    await tx.member.deleteMany({});

    // Delete MEMBER users
    if (memberUserIds.size > 0) {
      await tx.user.deleteMany({ where: { id: { in: Array.from(memberUserIds) } } });
    }
  });

  const after = {
    Notification: await prisma.notification.count(),
    Payment: await prisma.payment.count(),
    AppointmentBill: await prisma.appointmentBill.count(),
    Appointment: await prisma.appointment.count(),
    Contact: await prisma.contact.count(),
    Member: await prisma.member.count(),
    MemberUsersRemaining: await prisma.user.count({ where: { role: 'MEMBER' } }),
  };
  console.log('\n=== DONE ===');
  console.table(after);
}

main()
  .catch((e) => {
    console.error('prelaunch-reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


