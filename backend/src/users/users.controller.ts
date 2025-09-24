import { Controller, Get, Patch, Req, UseGuards, Body, Query } from '@nestjs/common';
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
}



