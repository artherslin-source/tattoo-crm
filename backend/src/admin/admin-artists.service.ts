import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userRole?: string, userBranchId?: string) {
    try {
      // 構建查詢條件
      const whereCondition: any = {};
      
      // 如果是分店經理，只能看到自己分店的刺青師
      if (userRole === 'BRANCH_MANAGER' && userBranchId) {
        whereCondition.branchId = userBranchId;
      }
      // BOSS 可以看到所有分店的刺青師，不需要額外條件

      const artists = await this.prisma.artist.findMany({
        where: whereCondition,
        include: { 
          user: true,
          branch: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
      console.log('DEBUG artists:', JSON.stringify(artists, null, 2));
      return artists;
    } catch (error) {
      console.error('ERROR in findAll artists:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: { 
        user: true,
        branch: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    });

    if (!artist) {
      throw new NotFoundException('刺青師不存在');
    }

    return artist;
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    branchId?: string;
    bio?: string;
    speciality?: string;
    portfolioUrl?: string;
    photoUrl?: string;
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    return this.prisma.$transaction(async (tx) => {
      // 創建 User
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          hashedPassword,
          role: 'ARTIST',
          branchId: data.branchId,
        },
      });

      // 創建 Artist
      const artist = await tx.artist.create({
        data: {
          userId: user.id,
          branchId: data.branchId,
          displayName: data.name,
          bio: data.bio,
          speciality: data.speciality,
          portfolioUrl: data.portfolioUrl,
          photoUrl: data.photoUrl,
        },
        include: { user: true },
      });

      return artist;
    });
  }

  async update(id: string, data: {
    name?: string;
    email?: string;
    branchId?: string;
    bio?: string;
    speciality?: string;
    portfolioUrl?: string;
    photoUrl?: string;
    active?: boolean;
  }) {
    console.log('🔧 AdminArtistsService.update called with:', { id, data });
    return this.prisma.$transaction(async (tx) => {
      const artist = await tx.artist.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!artist) {
        throw new NotFoundException('刺青師不存在');
      }

      // 更新 User
      if (data.name || data.email || data.branchId !== undefined) {
        console.log('🔄 Updating user with data:', { name: data.name, email: data.email, branchId: data.branchId });
        await tx.user.update({
          where: { id: artist.user.id },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.email && { email: data.email }),
            ...(data.branchId !== undefined && { branchId: data.branchId }),
          },
        });
      }

      // 更新 Artist
      console.log('🔄 Updating artist with data:', { bio: data.bio, speciality: data.speciality, portfolioUrl: data.portfolioUrl, photoUrl: data.photoUrl, active: data.active, name: data.name, branchId: data.branchId });
      const updatedArtist = await tx.artist.update({
        where: { id },
        data: {
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.speciality && { speciality: data.speciality }),
          ...(data.portfolioUrl && { portfolioUrl: data.portfolioUrl }),
          ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
          ...(data.active !== undefined && { active: data.active }),
          ...(data.name && { displayName: data.name }),
          ...(data.branchId !== undefined && { branchId: data.branchId }),
        },
        include: { 
          user: true,
          branch: {
            select: {
              id: true,
              name: true,
            }
          }
        },
      });

      return updatedArtist;
    });
  }

  async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const artist = await tx.artist.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!artist) {
        throw new NotFoundException('刺青師不存在');
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
