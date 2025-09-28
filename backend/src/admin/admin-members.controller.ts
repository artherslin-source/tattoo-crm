import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AdminMembersService } from "./admin-members.service";
import { PrismaService } from "../prisma/prisma.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@Controller("admin/members")
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminMembersController {
  constructor(
    private readonly service: AdminMembersService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  findAll(@Query() query: any) {
    console.log('AdminMembersController.findAll called');
    return this.service.findAll({
      search: query.search,
      role: query.role,
      status: query.status,
    });
  }

  @Post()
  createMember(@Body() data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    totalSpent?: number;
    balance?: number;
    membershipLevel?: string;
  }) {
    return this.service.createMember(data);
  }

  @Get('direct-test')
  async testDirectQuery() {
    console.log('AdminMembersController.testDirectQuery called');
    const result = await this.prisma.member.findMany({
      take: 1,
      select: {
        id: true,
        totalSpent: true,
        balance: true,
        membershipLevel: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          }
        },
      },
    });
    console.log('Direct Prisma query result:', result);
    return result;
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

  @Patch(':id')
  updateMember(@Param('id') id: string, @Body() data: {
    name?: string;
    email?: string;
    phone?: string;
    totalSpent?: number;
    balance?: number;
    membershipLevel?: string;
  }) {
    return this.service.updateMember(id, data);
  }

  @Delete(':id')
  deleteMember(@Param('id') id: string) {
    return this.service.deleteMember(id);
  }
}
