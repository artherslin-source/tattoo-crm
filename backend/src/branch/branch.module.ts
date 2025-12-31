import { Module } from '@nestjs/common';
import { BranchController } from './branch.controller';
import { BranchHoursController } from './branch-hours.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ArtistsModule } from '../artists/artists.module';

@Module({
  imports: [PrismaModule, ArtistsModule],
  controllers: [BranchController, BranchHoursController],
  providers: [],
})
export class BranchModule {}
