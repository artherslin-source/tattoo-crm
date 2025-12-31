import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function detectProductionDb(databaseUrl: string | undefined): boolean {
  if (!databaseUrl) return false;
  const u = databaseUrl.toLowerCase();
  return u.includes('railway') || u.includes('rlwy.net') || u.includes('proxy.rlwy.net');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const isProdLike = detectProductionDb(databaseUrl);
  const force = hasFlag('--yes') || hasFlag('--force');
  const iUnderstand = hasFlag('--i-understand');

  if (!force) {
    throw new Error('Refusing to run without --yes (or --force)');
  }
  if (isProdLike && !iUnderstand) {
    throw new Error('Refusing to run against production-like DB without --i-understand');
  }

  console.log('🧹 reset-domain-data: start');
  console.log(`   - production_like: ${isProdLike}`);

  async function safeDeleteMany<T extends { count: number }>(
    label: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e);
      console.warn(`⚠️ skip ${label}: ${msg}`);
      return { count: 0 } as T;
    }
  }

  // Delete in FK-safe order (domain-only)
  const deletedPaymentAlloc = await safeDeleteMany('PaymentAllocation', () => prisma.paymentAllocation.deleteMany());
  const deletedPayments = await safeDeleteMany('Payment', () => prisma.payment.deleteMany());
  const deletedBillItems = await safeDeleteMany('AppointmentBillItem', () => prisma.appointmentBillItem.deleteMany());
  const deletedBills = await safeDeleteMany('AppointmentBill', () => prisma.appointmentBill.deleteMany());
  const deletedCompleted = await safeDeleteMany('CompletedService', () => prisma.completedService.deleteMany());
  const deletedAppointments = await safeDeleteMany('Appointment', () => prisma.appointment.deleteMany());
  const deletedContacts = await safeDeleteMany('Contact', () => prisma.contact.deleteMany());

  // Demo members: we only remove Member rows and MEMBER users (keep admins/artists/services/branches)
  const deletedTopup = await safeDeleteMany('TopupHistory', () => prisma.topupHistory.deleteMany());
  const deletedMembers = await safeDeleteMany('Member', () => prisma.member.deleteMany());
  const deletedMemberUsers = await safeDeleteMany('User(role=MEMBER)', () =>
    prisma.user.deleteMany({ where: { role: 'MEMBER' } }),
  );

  console.log('✅ reset-domain-data: done', {
    paymentAllocations: deletedPaymentAlloc.count,
    payments: deletedPayments.count,
    billItems: deletedBillItems.count,
    bills: deletedBills.count,
    completedServices: deletedCompleted.count,
    appointments: deletedAppointments.count,
    contacts: deletedContacts.count,
    topupHistory: deletedTopup.count,
    members: deletedMembers.count,
    memberUsers: deletedMemberUsers.count,
  });
}

main()
  .catch((e) => {
    console.error('❌ reset-domain-data failed:', e?.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


