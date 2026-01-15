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
  | 'CHANGE_PASSWORD';

export type AuditEntityType =
  | 'ARTIST'
  | 'USER'
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

