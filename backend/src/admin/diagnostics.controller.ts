import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/diag')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class DiagnosticsController {
  constructor() {}

  @Get('routes')
  getRoutes() {
    // 簡化版本，返回固定的路由列表
    return {
      routes: [
        { method: 'GET', path: '/admin/dashboard', controller: 'AdminController', handler: 'getDashboard' },
        { method: 'GET', path: '/admin/stats', controller: 'AdminController', handler: 'getStats' },
        { method: 'GET', path: '/admin/services', controller: 'AdminServicesController', handler: 'findAll' },
        { method: 'POST', path: '/admin/services', controller: 'AdminServicesController', handler: 'create' },
        { method: 'GET', path: '/admin/services/images', controller: 'AdminServicesController', handler: 'getServiceImages' },
        { method: 'POST', path: '/admin/services/images/upload', controller: 'AdminServicesController', handler: 'uploadServiceImage' },
        { method: 'DELETE', path: '/admin/services/images/:category/:filename', controller: 'AdminServicesController', handler: 'deleteServiceImage' },
        { method: 'GET', path: '/admin/artists', controller: 'AdminArtistsController', handler: 'findAll' },
        { method: 'POST', path: '/admin/artists', controller: 'AdminArtistsController', handler: 'create' },
        { method: 'GET', path: '/admin/orders', controller: 'AdminOrdersController', handler: 'findAll' },
        { method: 'GET', path: '/admin/appointments', controller: 'AdminAppointmentsController', handler: 'findAll' },
        { method: 'GET', path: '/admin/members', controller: 'AdminMembersController', handler: 'findAll' },
        { method: 'GET', path: '/admin/diag/ping', controller: 'DiagnosticsController', handler: 'ping' },
        { method: 'GET', path: '/admin/diag/routes', controller: 'DiagnosticsController', handler: 'getRoutes' },
      ]
    };
  }

  @Get('ping')
  ping() {
    return { ok: true, time: new Date().toISOString() };
  }
}