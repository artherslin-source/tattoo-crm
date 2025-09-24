import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ArtistsService } from './artists.service';
import { ArtistsController } from './artists.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ArtistsController],
  providers: [ArtistsService],
  exports: [ArtistsService],
})
export class ArtistsModule {}



