import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrelaunchController } from './prelaunch.controller';
import { PrelaunchService } from './prelaunch.service';

@Module({
  imports: [PrismaModule],
  controllers: [PrelaunchController],
  providers: [PrelaunchService],
})
export class PrelaunchModule {}


