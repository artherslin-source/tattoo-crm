import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async create(createContactDto: CreateContactDto) {
    try {
      // 驗證分店是否存在
      const branch = await this.prisma.branch.findUnique({
        where: { id: createContactDto.branchId }
      });
      
      if (!branch) {
        throw new Error('指定的分店不存在');
      }
      
      return this.prisma.contact.create({
        data: createContactDto,
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('ContactsService.create error:', error);
      throw error;
    }
  }

  async findAll() {
    return this.prisma.contact.findMany({
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByBranch(branchId: string) {
    return this.prisma.contact.findMany({
      where: {
        branchId,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.contact.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    });
  }

  async update(id: string, updateContactDto: UpdateContactDto) {
    return this.prisma.contact.update({
      where: { id },
      data: updateContactDto,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.contact.delete({
      where: { id },
    });
  }

  async getStats() {
    const total = await this.prisma.contact.count();
    const pending = await this.prisma.contact.count({
      where: { status: 'PENDING' },
    });
    const contacted = await this.prisma.contact.count({
      where: { status: 'CONTACTED' },
    });
    const converted = await this.prisma.contact.count({
      where: { status: 'CONVERTED' },
    });
    const closed = await this.prisma.contact.count({
      where: { status: 'CLOSED' },
    });

    return {
      total,
      pending,
      contacted,
      converted,
      closed,
    };
  }

  async convertToAppointment(contactId: string) {
    // 將聯絡狀態更新為已轉換
    return this.prisma.contact.update({
      where: { id: contactId },
      data: { status: 'CONVERTED' },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    });
  }
}
