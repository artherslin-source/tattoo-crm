import { Controller, Get, Param, Query } from '@nestjs/common';
import { ArtistsService } from './artists.service';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  @Get()
  findAll() {
    return { message: 'Artists API OK' };
  }

  @Get('branch/:branchId')
  async listByBranch(@Param('branchId') branchId: string) {
    return this.artists.listByBranch(branchId);
  }

  @Get(':artistId/availability')
  async availability(
    @Param('artistId') artistId: string,
    @Query('date') date: string,
    @Query('duration') duration: string,
  ) {
    const durationMinutes = Math.max(15, parseInt(duration || '60', 10));
    return this.artists.availability(artistId, date, durationMinutes);
  }
}



