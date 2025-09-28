import { Controller, Get, Patch, Post, Req, UseGuards, Body, Query, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { BranchGuard } from '../common/guards/branch.guard';

interface UpdateUserDto {
  name?: string;
  phone?: string;
  avatarUrl?: string;
}

interface GetUsersQuery {
  branchId?: string;
  role?: string;
  page?: number;
  limit?: number;
}

interface TopUpDto {
  amount: number;
}

interface AdjustBalanceDto {
  amount: number;
  reason?: string;
}

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard, BranchGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@Req() req: any) {
    return this.usersService.me(req.user.userId);
  }

  @Patch('me')
  async updateMe(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateMe(req.user.userId, updateUserDto);
  }

  @Get()
  @Roles('BOSS', 'BRANCH_MANAGER')
  async getUsers(@Query() query: GetUsersQuery, @Req() req: any) {
    return this.usersService.getUsers(query, req.user.role, req.user.branchId);
  }

  // 財務相關端點
  @Post(':id/topup')
  @Roles('BOSS', 'BRANCH_MANAGER')
  async topUp(@Param('id') userId: string, @Body() topUpDto: TopUpDto) {
    if (topUpDto.amount <= 0) {
      throw new Error('Top-up amount must be positive');
    }
    return this.usersService.addTopUp(userId, topUpDto.amount);
  }

  @Patch(':id/balance')
  @Roles('BOSS', 'BRANCH_MANAGER')
  async adjustBalance(@Param('id') userId: string, @Body() adjustBalanceDto: AdjustBalanceDto) {
    return this.usersService.updateUserFinancials(userId, {
      balance: adjustBalanceDto.amount,
    });
  }

  @Get(':id/financials')
  @Roles('BOSS', 'BRANCH_MANAGER')
  async getUserFinancials(@Param('id') userId: string) {
    return this.usersService.me(userId);
  }
}



