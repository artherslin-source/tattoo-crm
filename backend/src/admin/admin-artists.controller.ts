import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ArtistsService } from '../artists/artists.service';
import { z } from 'zod';

const CreateArtistSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  branchId: z.string().optional(),
  specialties: z.array(z.string()).optional(),
});

const UpdateArtistSchema = CreateArtistSchema.partial();

@Controller('admin/artists')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.artistsService.getAllArtists(req.user.role, req.user.branchId);
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: any) {
    const input = CreateArtistSchema.parse(body);
    return this.artistsService.createArtist({
      name: input.name,
      email: input.email,
      branchId: input.branchId || req.user.branchId,
      specialties: input.specialties,
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const input = UpdateArtistSchema.parse(body);
    return this.artistsService.updateArtist(id, {
      name: input.name,
      email: input.email,
      specialties: input.specialties,
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.artistsService.deleteArtist(id);
  }
}
