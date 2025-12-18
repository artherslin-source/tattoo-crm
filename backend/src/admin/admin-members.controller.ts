import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AdminMembersService } from "./admin-members.service";
import { PrismaService } from "../prisma/prisma.service";
import { AccessGuard } from "../common/access/access.guard";
import { Actor } from "../common/access/actor.decorator";
import type { AccessActor } from "../common/access/access.types";

@Controller("admin/members")
@UseGuards(AuthGuard('jwt'), AccessGuard)
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
  findAll(@Actor() actor: AccessActor, @Query() query: any) {
    console.log('🎯 AdminMembersController.findAll called');
    console.log('🔍 Query params:', query);
    try {
      return this.service.findAll({
        actor,
        search: query.search,
        role: query.role,
        status: query.status,
        branchId: query.branchId,
        membershipLevel: query.membershipLevel,
        sortField: query.sortField,
        sortOrder: query.sortOrder,
        page: query.page ? Number(query.page) : undefined,
        pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      });
    } catch (error) {
      console.error('❌ Error in AdminMembersController.findAll:', error);
      throw error;
    }
  }

  @Post()
  createMember(@Actor() actor: AccessActor, @Body() data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    branchId?: string;
    role?: 'MEMBER' | 'ADMIN';
    totalSpent?: number;
    balance?: number;
    membershipLevel?: string;
  }) {
    return this.service.createMember(actor, data);
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
  async getTopupHistory(@Actor() actor: AccessActor, @Param('id') id: string) {
    console.log('🎯 Controller getTopupHistory called with id:', id);
    const result = await this.service.getTopupHistory(actor, id);
    console.log('TopupHistory response:', result);   // ✅ Debug
    return result;
  }

  @Patch(':id/topup')
  async topupUser(
    @Param('id') id: string,
    @Body() body: { amount: number },
    @Actor() actor: AccessActor
  ) {
    try {
      console.log('💰 Controller: topupUser called with:', { memberId: id, amount: body.amount, actor });

      const amount = Number(body.amount);
      if (amount <= 0) {
        throw new BadRequestException('儲值金額必須大於 0');
      }

      const operatorId = actor.id;
      console.log('💰 Controller: Calling service.topupUser with:', { id, amount, operatorId, actor });
      
      const result = await this.service.topupUser(actor, id, amount, operatorId);
      console.log('💰 Controller: topupUser completed successfully');
      return result;
    } catch (error) {
      console.error('❌ Controller: topupUser error:', error);
      throw error;
    }
  }

  @Post(':id/spend')
  async spend(
    @Param('id') id: string,
    @Body() body: { amount: number },
    @Actor() actor: AccessActor
  ) {
    try {
      console.log('💸 Controller: spend called with:', { memberId: id, amount: body.amount, actor });

      const amount = Number(body.amount);
      if (amount <= 0) {
        throw new BadRequestException('消費金額必須大於 0');
      }

      const operatorId = actor.id;
      console.log('💸 Controller: Calling service.spend with:', { id, amount, operatorId, actor });
      
      const result = await this.service.spend(actor, id, amount, operatorId);
      console.log('💸 Controller: spend completed successfully');
      return result;
    } catch (error) {
      console.error('❌ Controller: spend error:', error);
      throw error;
    }
  }

  @Get(':id')
  findOne(@Actor() actor: AccessActor, @Param('id') id: string) {
    return this.service.findOne(actor, id);
  }

  @Patch(':id/primary-artist')
  async setPrimaryArtist(
    @Actor() actor: AccessActor,
    @Param('id') id: string,
    @Body() body: { primaryArtistId: string }
  ) {
    if (!body?.primaryArtistId) throw new BadRequestException('primaryArtistId is required');
    return this.service.setPrimaryArtist(actor, id, body.primaryArtistId);
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
