import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('branches')
@UseGuards(AuthGuard('jwt'))
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  async list() {
    return this.branches.list();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('BOSS', 'BRANCH_MANAGER')
  async findOne(@Param('id') id: string) {
    return this.branches.findOne(id);
  }
}



