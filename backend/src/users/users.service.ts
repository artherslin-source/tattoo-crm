import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface UpdateUserDto {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string; // 刺青師介紹
  photoUrl?: string; // 刺青師照片
}

interface GetUsersQuery {
  branchId?: string;
  role?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        },
        member: {
          select: {
            totalSpent: true,
            balance: true,
            membershipLevel: true,
          }
        },
        artist: {
          select: {
            id: true,
            bio: true,
            speciality: true,
            portfolioUrl: true,
            photoUrl: true,
            displayName: true,
          }
        },
        createdAt: true,
        lastLogin: true,
        status: true,
      },
    });
  }

  async getUsers(query: GetUsersQuery, userRole: string, userBranchId?: string) {
    const { branchId, role, page = 1, limit = 10 } = query;
    
    // 構建 where 條件
    const where: any = {};
    
    // 如果不是 BOSS，只能查看自己分店的用戶
    if (userRole !== 'BOSS') {
      where.branchId = userBranchId;
    } else if (branchId) {
      // BOSS 可以指定分店查看
      where.branchId = branchId;
    }
    
    if (role) {
      where.role = role;
    }

    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          branchId: true,
          branch: {
            select: {
              id: true,
              name: true,
            }
          },
          member: {
            select: {
              totalSpent: true,
              balance: true,
              membershipLevel: true,
            }
          },
          createdAt: true,
          lastLogin: true,
          status: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateMe(userId: string, updateUserDto: UpdateUserDto) {
    // 如果更新手機號碼，檢查唯一性
    if (updateUserDto.phone !== undefined && updateUserDto.phone !== null && updateUserDto.phone.trim() !== '') {
      // 驗證手機號碼格式（至少10位數字）
      if (!/^[0-9]{10,}$/.test(updateUserDto.phone)) {
        throw new BadRequestException('手機號碼格式不正確，請輸入至少10位數字');
      }

      // 檢查手機號碼是否已被其他用戶使用
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: updateUserDto.phone },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('此手機號碼已被其他用戶使用');
      }
    }

    const updateData: any = {};
    if (updateUserDto.name !== undefined) updateData.name = updateUserDto.name;
    if (updateUserDto.phone !== undefined) {
      // 如果手機號碼是空字串，設為 null
      updateData.phone = updateUserDto.phone === '' ? null : updateUserDto.phone;
    }
    if (updateUserDto.avatarUrl !== undefined) updateData.avatarUrl = updateUserDto.avatarUrl;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        branchId: true,
        createdAt: true,
        lastLogin: true,
        status: true,
        artist: {
          select: {
            id: true,
            bio: true,
            speciality: true,
            portfolioUrl: true,
            photoUrl: true,
            displayName: true,
          }
        },
      },
    });

    // 如果用戶是刺青師且有 bio 或 photoUrl 更新，同時更新 Artist 表
    if (updatedUser.role === 'ARTIST' && updatedUser.artist) {
      const artistUpdateData: any = {};
      if (updateUserDto.bio !== undefined) artistUpdateData.bio = updateUserDto.bio;
      if (updateUserDto.photoUrl !== undefined) artistUpdateData.photoUrl = updateUserDto.photoUrl;
      
      if (Object.keys(artistUpdateData).length > 0) {
        await this.prisma.artist.update({
          where: { id: updatedUser.artist.id },
          data: artistUpdateData,
        });
        // 重新獲取更新後的 artist 信息
        const artist = await this.prisma.artist.findUnique({
          where: { id: updatedUser.artist.id },
          select: {
            id: true,
            bio: true,
            speciality: true,
            portfolioUrl: true,
            photoUrl: true,
            displayName: true,
          }
        });
        if (artist) {
          updatedUser.artist = artist;
        }
      }
    }

    return updatedUser;
  }

  // 財務相關方法
  async updateUserFinancials(userId: string, updates: {
    totalSpent?: number;
    balance?: number;
    membershipLevel?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 確保用戶有 Member 記錄
      const member = await tx.member.findUnique({
        where: { userId },
      });

      if (!member) {
        // 如果沒有 Member 記錄，創建一個
        await tx.member.create({
          data: {
            userId,
            totalSpent: 0,
            balance: 0,
          },
        });
      }

      // 更新 Member 記錄
      const updatedMember = await tx.member.update({
        where: { userId },
        data: updates,
      });

      // 返回用戶和財務資訊
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          member: {
            select: {
              totalSpent: true,
              balance: true,
              membershipLevel: true,
            }
          }
        },
      });

      return user;
    });
  }

  async addTopUp(userId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      // 確保用戶有 Member 記錄
      const member = await tx.member.findUnique({
        where: { userId },
      });

      if (!member) {
        // 如果沒有 Member 記錄，創建一個
        await tx.member.create({
          data: {
            userId,
            totalSpent: 0,
            balance: amount,
          },
        });
      } else {
        // 更新餘額
        await tx.member.update({
          where: { userId },
          data: {
            balance: { increment: amount },
          },
        });
      }

      // 返回用戶和財務資訊
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          member: {
            select: {
              totalSpent: true,
              balance: true,
              membershipLevel: true,
            }
          }
        },
      });

      return user;
    });
  }

  async processPayment(userId: string, amount: number, useStoredValue: boolean = false) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.findUnique({
        where: { userId },
      });

      if (!member) {
        throw new Error('Member record not found');
      }

      if (useStoredValue && member.balance < amount) {
        throw new Error('Insufficient stored value balance');
      }

      const updateData: any = {
        totalSpent: { increment: amount },
      };

      if (useStoredValue) {
        updateData.balance = { decrement: amount };
      }

      await tx.member.update({
        where: { userId },
        data: updateData,
      });

      // 返回用戶和財務資訊
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          member: {
            select: {
              totalSpent: true,
              balance: true,
              membershipLevel: true,
            }
          }
        },
      });

      return user;
    });
  }
}



