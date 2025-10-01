import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, BadRequestException, Req } from "@nestjs/common";
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
  ) {
    console.log('🏗️ AdminMembersController constructor called');
  }

  @Get('test')
  async testEndpoint() {
    console.log('🎯 AdminMembersController.testEndpoint called');
    return { message: 'AdminMembersController is working', timestamp: new Date().toISOString() };
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

  @Get()
  findAll(@Query() query: any) {
    console.log('🎯 AdminMembersController.findAll called');
    console.log('🔍 Query params:', query);
    try {
      return this.service.findAll({
        search: query.search,
        role: query.role,
        status: query.status,
        sortField: query.sortField,
        sortOrder: query.sortOrder,
      });
    } catch (error) {
      console.error('❌ Error in AdminMembersController.findAll:', error);
      throw error;
    }
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

  @Get('simple-test')
  async simpleTest() {
    console.log('✅ SIMPLE TEST Controller method called');
    return { message: '簡單測試路由正常工作' };
  }

  @Get(':id/test-topups')
  async testTopupHistory(@Param('id') id: string) {
    console.log('✅ TEST Controller method called with id:', id);
    return { message: 'TEST 路由正常工作', id };
  }

  @Get(':id/topups')
  async getTopupHistory(@Param('id') id: string) {
    console.log('🎯 Controller getTopupHistory called with id:', id);
    const result = await this.service.getTopupHistory(id);
    console.log('TopupHistory response:', result);   // ✅ Debug
    return result;
  }

  @Patch(':id/topup')
  @UseGuards(AuthGuard('jwt'))
  async topupUser(
    @Param('id') id: string,
    @Body() body: { amount: number },
    @Req() req
  ) {
    console.log('DEBUG req.user:', req.user); // Debug 用，確認是否有登入的 user 資訊

    const amount = Number(body.amount);
    if (amount <= 0) {
      throw new BadRequestException('儲值金額必須大於 0');
    }

    if (!req.user || !req.user.id) {
      throw new BadRequestException('操作人員未登入或缺少 ID');
    }

    // 權限檢查：只有 BOSS、BRANCH_MANAGER、SUPER_ADMIN 可以執行儲值操作
    const allowedRoles = ['BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(req.user.role)) {
      throw new BadRequestException('權限不足：只有管理員才能執行儲值操作');
    }

    const operatorId = req.user.id;
    return this.service.topupUser(id, amount, operatorId);
  }

  @Post(':id/spend')
  @UseGuards(AuthGuard('jwt'))
  async spend(
    @Param('id') id: string,
    @Body() body: { amount: number },
    @Req() req
  ) {
    console.log('DEBUG req.user for spend:', req.user);

    const amount = Number(body.amount);
    if (amount <= 0) {
      throw new BadRequestException('消費金額必須大於 0');
    }

    if (!req.user || !req.user.id) {
      throw new BadRequestException('操作人員未登入或缺少 ID');
    }

    // 權限檢查：只有 BOSS、BRANCH_MANAGER、SUPER_ADMIN 可以執行消費操作
    const allowedRoles = ['BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(req.user.role)) {
      throw new BadRequestException('權限不足：只有管理員才能執行消費操作');
    }

    const operatorId = req.user.id;
    return this.service.spend(id, amount, operatorId);
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
