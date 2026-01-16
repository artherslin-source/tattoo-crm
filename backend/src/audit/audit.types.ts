import type { AccessActor } from '../common/access/access.types';

export type AuditAction =
  | 'ARTIST_PROFILE_UPDATE'
  | 'ADMIN_ARTIST_UPDATE'
  | 'PORTFOLIO_CREATE'
  | 'PORTFOLIO_UPDATE'
  | 'PORTFOLIO_DELETE'
  | 'EXPORT_SERVICES_CSV'
  | 'EXPORT_BILLING_XLSX'
  | 'BACKUP_EXPORT_START'
  | 'BACKUP_EXPORT_DOWNLOAD'
  | 'CHANGE_PASSWORD'
  // Artist backoffice - members
  | 'MEMBER_CREATE'
  | 'MEMBER_TOPUP'
  | 'MEMBER_SPEND'
  | 'MEMBER_UPDATE'
  | 'MEMBER_SET_PRIMARY_ARTIST'
  | 'MEMBER_RESET_PASSWORD'
  | 'MEMBER_DELETE'
  // Artist backoffice - contacts
  | 'CONTACT_CREATE'
  | 'CONTACT_UPDATE'
  | 'CONTACT_CONVERT_TO_APPOINTMENT'
  | 'CONTACT_DELETE'
  // Artist backoffice - appointments
  | 'APPOINTMENT_CREATE'
  | 'APPOINTMENT_UPDATE'
  | 'APPOINTMENT_UPDATE_STATUS'
  | 'APPOINTMENT_RESCHEDULE'
  | 'APPOINTMENT_CANCEL'
  | 'APPOINTMENT_NO_SHOW'
  | 'APPOINTMENT_DELETE'
  // Artist backoffice - billing
  | 'BILL_CREATE'
  | 'BILL_UPDATE'
  | 'BILL_RECORD_PAYMENT'
  | 'BILL_REFUND_TO_STORED_VALUE'
  | 'BILL_DELETE'
  | 'BILL_REBUILD'
  | 'BILL_RECOMPUTE_ALLOCATIONS';

export type AuditEntityType =
  | 'ARTIST'
  | 'USER'
  | 'MEMBER'
  | 'CONTACT'
  | 'APPOINTMENT'
  | 'PORTFOLIO_ITEM'
  | 'SERVICE'
  | 'BILLING'
  | 'BACKUP';

export type AuditDiff = Record<string, { from: unknown; to: unknown }>;

export interface AuditMeta {
  ip?: string | null;
  userAgent?: string | null;
  branchId?: string | null;
}

export interface AuditLogInput {
  actor?: AccessActor | null;
  action: AuditAction | string;
  entityType?: AuditEntityType | string | null;
  entityId?: string | null;
  diff?: AuditDiff | null;
  metadata?: Record<string, unknown> | null;
  meta?: AuditMeta | null;
}

