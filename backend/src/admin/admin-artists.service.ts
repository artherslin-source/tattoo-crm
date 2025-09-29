import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      const artists = await this.prisma.artist.findMany({
        include: { user: true },
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
      include: { user: true },
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
    speciality?: string;
    portfolioUrl?: string;
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
          speciality: data.speciality,
          portfolioUrl: data.portfolioUrl,
        },
        include: { user: true },
      });

      return artist;
    });
  }

  async update(id: string, data: {
    name?: string;
    email?: string;
    speciality?: string;
    portfolioUrl?: string;
    active?: boolean;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const artist = await tx.artist.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!artist) {
        throw new NotFoundException('刺青師不存在');
      }

      // 更新 User
      if (data.name || data.email) {
        await tx.user.update({
          where: { id: artist.user.id },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.email && { email: data.email }),
          },
        });
      }

      // 更新 Artist
      const updatedArtist = await tx.artist.update({
        where: { id },
        data: {
          ...(data.speciality && { speciality: data.speciality }),
          ...(data.portfolioUrl && { portfolioUrl: data.portfolioUrl }),
          ...(data.active !== undefined && { active: data.active }),
          ...(data.name && { displayName: data.name }),
        },
        include: { user: true },
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
