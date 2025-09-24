import { Controller, Get, Patch, Param, Body, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AdminMembersService } from "./admin-members.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@Controller("admin/members")
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminMembersController {
  constructor(private readonly service: AdminMembersService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll({
      search: query.search,
      role: query.role,
      status: query.status,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body('role') role: string) {
    return this.service.updateRole(id, role);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateStatus(id, status);
  }

  @Patch(':id/password')
  resetPassword(@Param('id') id: string, @Body('password') password: string) {
    return this.service.resetPassword(id, password);
  }
}
