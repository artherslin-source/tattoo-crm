import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get('public')
  async listPublic() {
    return this.branches.list();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async list() {
    return this.branches.list();
  }

  @Get('accessible')
  @UseGuards(AuthGuard('jwt'), AccessGuard)
  async listAccessible(@Actor() actor: AccessActor) {
    return this.branches.listAccessible(actor);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('BOSS')
  async findOne(@Param('id') id: string) {
    return this.branches.findOne(id);
  }
}



