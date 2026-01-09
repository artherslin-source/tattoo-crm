import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrelaunchController } from './prelaunch.controller';
import { PrelaunchService } from './prelaunch.service';
import { PrelaunchApiController } from './prelaunch-api.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PrelaunchController, PrelaunchApiController],
  providers: [PrelaunchService],
})
export class PrelaunchModule {}


