import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminArtistsService } from './admin-artists.service';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

const CreateArtistSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  branchId: z.string().optional(),
  speciality: z.string().optional(),
  portfolioUrl: z.string().optional(),
  active: z.boolean().optional(),
});

const UpdateArtistSchema = CreateArtistSchema.partial();

@Controller('admin/artists')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminArtistsController {
  constructor(
    private readonly adminArtistsService: AdminArtistsService,
    private readonly prisma: PrismaService
  ) {}

  @Get('direct-test')
  async directTest() {
    console.log('🧪 Direct Prisma test');
    return this.prisma.artist.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get()
  async findAll(@Req() req: any) {
    console.log('🎯 AdminArtistsController.findAll called');
    try {
      console.log('🔧 Trying to call adminArtistsService.findAll()');
      return this.adminArtistsService.findAll();
    } catch (error) {
      console.log('❌ Error calling adminArtistsService:', error);
      console.log('🔧 Trying direct Prisma query as fallback');
      return this.prisma.artist.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      });
    }
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: any) {
    const input = CreateArtistSchema.parse(body);
    
    // 如果是 BOSS，需要指定 branchId；如果是 BRANCH_MANAGER，使用自己的 branchId
    const branchId = input.branchId || req.user.branchId;
    
    if (!branchId) {
      throw new Error('需要指定分店 ID');
    }

    return this.adminArtistsService.create({
      name: input.name,
      email: input.email,
      password: 'temp_password_12345678', // 臨時密碼，需要後續修改
      branchId,
      speciality: input.speciality,
      portfolioUrl: input.portfolioUrl,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.adminArtistsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const input = UpdateArtistSchema.parse(body);

    return this.adminArtistsService.update(id, {
      name: input.name,
      email: input.email,
      speciality: input.speciality,
      portfolioUrl: input.portfolioUrl,
      active: input.active,
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.adminArtistsService.delete(id);
  }
}
