import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.branch.findMany({ 
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            users: true,
            artists: true,
            orders: true,
            appointments: true,
          }
        }
      }
    });
  }

  async findOne(id: string) {
    return this.prisma.branch.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          }
        },
        artists: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: {
            users: true,
            artists: true,
            orders: true,
            appointments: true,
          }
        }
      }
    });
  }
}



