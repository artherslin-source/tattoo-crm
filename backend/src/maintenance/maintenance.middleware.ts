import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MaintenanceService } from './maintenance.service';

@Injectable()
export class MaintenanceMiddleware {
  constructor(private readonly maintenance: MaintenanceService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const state = await this.maintenance.getState();
    if (!state.enabled) return next();

    // Allow health checks and the restore endpoint to keep working during maintenance.
    const p = req.path || '';
    const full = (req.originalUrl || req.url || p || '').split('?')[0];
    // Note: In some deployments/proxies, requests may include a leading `/api` prefix.
    // We whitelist both variants to avoid blocking the maintenance status endpoint itself.
    if (full.startsWith('/health') || full.startsWith('/api/health')) return next();
    if (full.startsWith('/public/maintenance') || full.startsWith('/api/public/maintenance')) return next();
    if (full.startsWith('/admin/maintenance') || full.startsWith('/api/admin/maintenance')) return next();
    if (full === '/admin/backup/restore' || full === '/api/admin/backup/restore') return next();
    // Allow backup export status/download so BOSS can operate during maintenance if needed.
    if (full.startsWith('/admin/backup/export') || full.startsWith('/api/admin/backup/export')) return next();
    // Allow login during maintenance so BOSS can still authenticate and turn it off.
    if (full.startsWith('/auth/login') || full.startsWith('/api/auth/login')) return next();
    if (full.startsWith('/auth/refresh') || full.startsWith('/api/auth/refresh')) return next();
    if (full.startsWith('/auth/me') || full.startsWith('/api/auth/me')) return next();

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '120');
    res.status(503).json({
      maintenance: true,
      message: state.reason || '系統維護中，請稍後再試',
      since: state.since ?? null,
    });
  }
}


