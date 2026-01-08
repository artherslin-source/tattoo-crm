import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type MaintenanceState = {
  enabled: boolean;
  reason?: string;
  since?: string;
};

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly KEY = 'MAINTENANCE_MODE';
  private ephemeral: MaintenanceState = { enabled: false };
  private cache: { state: MaintenanceState; fetchedAt: number } | null = null;

  // Ephemeral maintenance: used for backup restore (auto) and should NOT persist across restart.
  enableEphemeral(reason?: string) {
    this.ephemeral = { enabled: true, reason, since: new Date().toISOString() };
  }

  disableEphemeral() {
    this.ephemeral = { enabled: false };
  }

  // Persistent maintenance: manual toggle by BOSS, stored in DB (SiteConfig).
  async enablePersistent(reason?: string) {
    const next: MaintenanceState = { enabled: true, reason, since: new Date().toISOString() };
    await this.prisma.siteConfig.upsert({
      where: { key: this.KEY },
      create: { key: this.KEY, value: next as any },
      update: { value: next as any },
    });
    this.cache = { state: next, fetchedAt: Date.now() };
  }

  async disablePersistent() {
    const next: MaintenanceState = { enabled: false };
    await this.prisma.siteConfig.upsert({
      where: { key: this.KEY },
      create: { key: this.KEY, value: next as any },
      update: { value: next as any },
    });
    this.cache = { state: next, fetchedAt: Date.now() };
  }

  private async getPersistentCached(): Promise<MaintenanceState> {
    const ttlMs = 1500;
    if (this.cache && Date.now() - this.cache.fetchedAt < ttlMs) return this.cache.state;
    const row = await this.prisma.siteConfig.findUnique({ where: { key: this.KEY } });
    const state = (row?.value as any as MaintenanceState) ?? { enabled: false };
    this.cache = { state, fetchedAt: Date.now() };
    return state;
  }

  async getState(): Promise<MaintenanceState> {
    if (this.ephemeral.enabled) return this.ephemeral;
    return this.getPersistentCached();
  }
}


