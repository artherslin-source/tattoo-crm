import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { INSTANCE_METADATA_SYMBOL } from '@nestjs/core/constants';

@Controller('admin/diag')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class DiagnosticsController {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  @Get('routes')
  getRoutes() {
    const controllers = this.discoveryService.getControllers();
    const routes = [];

    controllers.forEach(wrapper => {
      const { instance } = wrapper;
      if (!instance || typeof instance === 'string') {
        return;
      }

      const prototype = Object.getPrototypeOf(instance);
      this.metadataScanner.scanFromPrototype(instance, prototype, (methodName) => {
        const routePath = Reflect.getMetadata('path', instance[methodName]);
        const requestMethod = Reflect.getMetadata('method', instance[methodName]);
        const controllerPath = Reflect.getMetadata('path', instance.constructor);

        if (routePath !== undefined && requestMethod !== undefined) {
          routes.push({
            method: requestMethod,
            path: `${controllerPath || ''}/${routePath === '/' ? '' : routePath}`,
            controller: instance.constructor.name,
            handler: methodName,
          });
        }
      });
    });
    return routes;
  }

  @Get('ping')
  ping() {
    return { ok: true, time: new Date().toISOString() };
  }
}