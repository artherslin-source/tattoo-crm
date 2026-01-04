import { Controller, Get, Patch, Post, Req, UseGuards, Body, Query, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { BranchGuard } from '../common/guards/branch.guard';
import { buildActorFromJwtUser } from '../common/access/access.types';
import { AuthService } from '../auth/auth.service';

interface UpdateUserDto {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string; // 刺青師介紹
  photoUrl?: string; // 刺青師照片
  bookingLatestStartTime?: string; // ARTIST：最晚可預約開始時間（HH:mm）
  booking24hEnabled?: boolean; // ARTIST：啟動 24 小時制
}

interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

interface GetUsersQuery {
  branchId?: string;
  role?: string;
  page?: number;
  limit?: number;
}

interface TopUpDto {
  amount: number;
  method?: string;
  notes?: string;
}

interface AdjustBalanceDto {
  amount: number;
  reason?: string;
}

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get('me')
  async me(@Req() req: any) {
    console.log('DEBUG req.user:', req.user);
    console.log('DEBUG req.user.id:', req.user?.id);
    console.log('DEBUG req.user type:', typeof req.user);
    console.log('DEBUG req.user keys:', req.user ? Object.keys(req.user) : 'req.user is null/undefined');
    
    if (!req.user || !req.user.id) {
      console.log('ERROR: req.user or req.user.id is missing');
      throw new Error('User not authenticated or missing ID');
    }
    
    return this.usersService.me(req.user.id);
  }

  @Get('me/bills')
  @Roles('MEMBER')
  async myBills(@Req() req: any) {
    return this.usersService.listMyBills(req.user.id);
  }

  @Patch('me')
  async updateMe(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateMe(req.user.id, updateUserDto);
  }

  @Patch('me/password')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto.oldPassword, dto.newPassword);
  }

  @Get()
  @Roles('BOSS')
  async getUsers(@Query() query: GetUsersQuery, @Req() req: any) {
    return this.usersService.getUsers(query, req.user.role, req.user.branchId);
  }

  // 財務相關端點
  @Post(':id/topup')
  @Roles('BOSS')
  async topUp(@Req() req: any, @Param('id') userId: string, @Body() topUpDto: TopUpDto) {
    if (topUpDto.amount <= 0) {
      throw new Error('Top-up amount must be positive');
    }
    const actor = buildActorFromJwtUser({ id: req.user.id, role: req.user.role, branchId: req.user.branchId });
    if (!actor) throw new Error('Invalid actor');
    return this.usersService.addTopUp(actor, userId, topUpDto.amount, { method: topUpDto.method, notes: topUpDto.notes });
  }

  @Patch(':id/balance')
  @Roles('BOSS', 'SUPER_ADMIN')
  async adjustBalance(@Param('id') userId: string, @Body() adjustBalanceDto: AdjustBalanceDto) {
    return this.usersService.updateUserFinancials(userId, {
      balance: adjustBalanceDto.amount,
    });
  }

  @Get(':id/financials')
  @Roles('BOSS')
  async getUserFinancials(@Param('id') userId: string) {
    return this.usersService.me(userId);
  }
}



