import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ArtistsService } from '../artists/artists.service';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

const CreateArtistSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  branchId: z.string().optional(),
  speciality: z.string().optional(),
  specialties: z.array(z.string()).optional(),
});

const UpdateArtistSchema = CreateArtistSchema.partial();

@Controller('admin/artists')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminArtistsController {
  constructor(
    private readonly artistsService: ArtistsService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async findAll(@Req() req: any) {
    const where: any = {};
    
    // 如果不是 BOSS，只能查看自己分店的刺青師
    if (req.user.role !== 'BOSS') {
      where.branchId = req.user.branchId;
    }

    return this.prisma.artist.findMany({
      where,
      select: {
        id: true,
        speciality: true,
        portfolioUrl: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true, 
            role: true,
            status: true,
            createdAt: true 
          } 
        },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: any) {
    const input = CreateArtistSchema.parse(body);
    
    // 如果是 BOSS，需要指定 branchId；如果是 BRANCH_MANAGER，使用自己的 branchId
    const branchId = input.branchId || req.user.branchId;
    
    if (!branchId) {
      throw new Error('需要指定分店 ID');
    }

    return this.prisma.$transaction(async (tx) => {
      // 創建 User
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          hashedPassword: 'temp_password_12345678', // 臨時密碼，需要後續修改
          role: 'ARTIST',
          branchId,
        },
      });

      // 創建 Artist
      const artist = await tx.artist.create({
        data: {
          userId: user.id,
          branchId,
          displayName: input.name,
          speciality: input.speciality,
        },
        select: {
          id: true,
          speciality: true,
          portfolioUrl: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          user: { 
            select: { 
              id: true, 
              name: true, 
              email: true, 
              role: true,
              status: true,
              createdAt: true 
            } 
          },
          branch: { select: { id: true, name: true } },
        },
      });

      return artist;
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      select: {
        id: true,
        speciality: true,
        portfolioUrl: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true, 
            phone: true,
            role: true,
            status: true,
            createdAt: true 
          } 
        },
        branch: { select: { id: true, name: true } },
      },
    });

    if (!artist) {
      throw new Error('刺青師不存在');
    }

    return artist;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const input = UpdateArtistSchema.parse(body);

    return this.prisma.$transaction(async (tx) => {
      const artist = await tx.artist.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!artist) {
        throw new Error('刺青師不存在');
      }

      // 更新 User
      if (input.name || input.email) {
        await tx.user.update({
          where: { id: artist.user.id },
          data: {
            ...(input.name && { name: input.name }),
            ...(input.email && { email: input.email }),
          },
        });
      }

      // 更新 Artist
      const updatedArtist = await tx.artist.update({
        where: { id },
        data: {
          ...(input.speciality && { speciality: input.speciality }),
          ...(input.name && { displayName: input.name }),
        },
        select: {
          id: true,
          speciality: true,
          portfolioUrl: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          user: { 
            select: { 
              id: true, 
              name: true, 
              email: true, 
              role: true,
              status: true,
              createdAt: true 
            } 
          },
          branch: { select: { id: true, name: true } },
        },
      });

      return updatedArtist;
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.$transaction(async (tx) => {
      const artist = await tx.artist.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!artist) {
        throw new Error('刺青師不存在');
      }

      // 刪除 Artist
      await tx.artist.delete({
        where: { id },
      });

      // 刪除 User
      await tx.user.delete({
        where: { id: artist.user.id },
      });

      return { message: '刺青師已刪除' };
    });
  }
}
