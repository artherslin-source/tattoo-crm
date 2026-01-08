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
    if (p.startsWith('/health')) return next();
    if (p.startsWith('/public/maintenance')) return next();
    if (p.startsWith('/admin/maintenance')) return next();
    if (p === '/admin/backup/restore') return next();

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '120');
    res.status(503).json({
      maintenance: true,
      message: state.reason || '系統維護中，請稍後再試',
      since: state.since ?? null,
    });
  }
}


