import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/diag')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class DiagnosticsController {
  constructor() {}

  @Get('ping')
  ping() {
    return {
      ok: true,
      time: new Date().toISOString(),
      message: 'Diagnostics endpoint is working'
    };
  }

  @Get('routes')
  getRoutes() {
    // 這裡我們返回所有 admin 相關的路由
    // 在實際應用中，可以從 NestJS 的 Router Explorer 獲取
    const routes = [
      { method: 'GET', path: '/admin/dashboard' },
      { method: 'GET', path: '/admin/stats' },
      { method: 'GET', path: '/admin/services' },
      { method: 'POST', path: '/admin/services' },
      { method: 'PUT', path: '/admin/services/:id' },
      { method: 'DELETE', path: '/admin/services/:id' },
      { method: 'GET', path: '/admin/members' },
      { method: 'GET', path: '/admin/members/:id' },
      { method: 'PATCH', path: '/admin/members/:id/role' },
      { method: 'PATCH', path: '/admin/members/:id/status' },
      { method: 'PATCH', path: '/admin/members/:id/password' },
      { method: 'GET', path: '/admin/artists' },
      { method: 'POST', path: '/admin/artists' },
      { method: 'PATCH', path: '/admin/artists/:id' },
      { method: 'DELETE', path: '/admin/artists/:id' },
      { method: 'GET', path: '/admin/appointments' },
      { method: 'GET', path: '/admin/appointments/:id' },
      { method: 'PATCH', path: '/admin/appointments/:id/status' },
      { method: 'PATCH', path: '/admin/appointments/:id' },
      { method: 'DELETE', path: '/admin/appointments/:id' },
      { method: 'GET', path: '/admin/orders' },
      { method: 'GET', path: '/admin/orders/:id' },
      { method: 'PATCH', path: '/admin/orders/:id/status' },
      { method: 'GET', path: '/admin/diag/ping' },
      { method: 'GET', path: '/admin/diag/routes' }
    ];

    return {
      total: routes.length,
      routes: routes,
      timestamp: new Date().toISOString()
    };
  }
}
