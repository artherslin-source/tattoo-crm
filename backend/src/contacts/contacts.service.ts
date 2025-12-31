import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { isBoss, type AccessActor } from '../common/access/access.types';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async createPublic(createContactDto: CreateContactDto) {
    // Public endpoint: allow creating a lead/contact without owner assignment.
    // Do not allow ownerArtistId from public channel.
    const safeDto: CreateContactDto = {
      name: createContactDto.name,
      email: createContactDto.email,
      phone: createContactDto.phone,
      branchId: createContactDto.branchId,
      notes: createContactDto.notes,
      ownerArtistId: undefined,
    };

    // Validate branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: safeDto.branchId },
      select: { id: true },
    });
    if (!branch) {
      throw new Error('指定的分店不存在');
    }

    return this.prisma.contact.create({
      data: safeDto,
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

  private async ensureContactReadable(actor: AccessActor, contactId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        ownerArtistId: true,
        appointments: { select: { artistId: true } },
      },
    });
    if (!contact) throw new NotFoundException('聯絡不存在');
    if (isBoss(actor)) return contact;
    const isOwner = !!contact.ownerArtistId && contact.ownerArtistId === actor.id;
    const isApptArtist = contact.appointments.some((a) => a.artistId === actor.id);
    if (!isOwner && !isApptArtist) throw new ForbiddenException('Insufficient permissions');
    return contact;
  }

  async create(actor: AccessActor, createContactDto: CreateContactDto) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can create contacts');
    try {
      // 驗證分店是否存在
      const branch = await this.prisma.branch.findUnique({
        where: { id: createContactDto.branchId }
      });
      
      if (!branch) {
        throw new Error('指定的分店不存在');
      }

      if (createContactDto.ownerArtistId) {
        const owner = await this.prisma.user.findUnique({
          where: { id: createContactDto.ownerArtistId },
          select: { id: true, role: true },
        });
        if (!owner) throw new Error('指定的刺青師不存在');
        if (String(owner.role || '').toUpperCase() !== 'ARTIST') {
          throw new Error('ownerArtistId 必須是 ARTIST');
        }
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

  async findAll(actor: AccessActor) {
    const where = isBoss(actor)
      ? {}
      : {
          OR: [
            { ownerArtistId: actor.id },
            { appointments: { some: { artistId: actor.id } } },
          ],
        };
    return this.prisma.contact.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        ownerArtist: {
          select: {
            id: true,
            name: true,
            phone: true,
            branchId: true,
            branch: { select: { id: true, name: true } },
          },
        },
        // Latest appointment reference for deep-linking from CONVERTED contacts.
        appointments: {
          select: { id: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
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

  async findOne(actor: AccessActor, id: string) {
    await this.ensureContactReadable(actor, id);
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
        ownerArtist: {
          select: {
            id: true,
            name: true,
            phone: true,
            branchId: true,
            branch: { select: { id: true, name: true } },
          },
        },
        // Keep a thin appointments list, but order it to make "latest" deterministic.
        appointments: {
          select: { id: true, artistId: true, startAt: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async update(actor: AccessActor, id: string, updateContactDto: UpdateContactDto) {
    await this.ensureContactReadable(actor, id);
    const data: UpdateContactDto = { ...updateContactDto };

    // Artists can only update limited fields on their own contacts
    if (!isBoss(actor)) {
      delete (data as any).branchId;
      delete (data as any).name;
      delete (data as any).email;
      delete (data as any).ownerArtistId;
    }

    return this.prisma.contact.update({
      where: { id },
      data,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        ownerArtist: {
          select: {
            id: true,
            name: true,
            phone: true,
            branchId: true,
            branch: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async remove(actor: AccessActor, id: string) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can delete contacts');
    return this.prisma.contact.delete({
      where: { id },
    });
  }

  async getStats(actor: AccessActor) {
    const where = isBoss(actor)
      ? {}
      : {
          OR: [
            { ownerArtistId: actor.id },
            { appointments: { some: { artistId: actor.id } } },
          ],
        };
    const total = await this.prisma.contact.count({ where });
    const pending = await this.prisma.contact.count({
      where: { ...where, status: 'PENDING' },
    });
    const contacted = await this.prisma.contact.count({
      where: { ...where, status: 'CONTACTED' },
    });
    const converted = await this.prisma.contact.count({
      where: { ...where, status: 'CONVERTED' },
    });
    const closed = await this.prisma.contact.count({
      where: { ...where, status: 'CLOSED' },
    });

    return {
      total,
      pending,
      contacted,
      converted,
      closed,
    };
  }

  async convertToAppointment(actor: AccessActor, contactId: string) {
    // Mark converted; also ensure owner is assigned if possible
    await this.ensureContactReadable(actor, contactId);
    return this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({
        where: { id: contactId },
        include: { appointments: { select: { id: true, artistId: true, createdAt: true } } },
      });
      if (!contact) throw new NotFoundException('聯絡不存在');

      const existing = contact.appointments
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      if (contact.status === 'CONVERTED' || existing) {
        throw new ConflictException({
          message: '此聯絡已轉換為預約，請勿重複轉換',
          existingAppointmentId: existing?.id,
        });
      }

      const inferredArtistId = contact.appointments.find((a) => !!a.artistId)?.artistId ?? null;
      const nextOwnerArtistId = contact.ownerArtistId ?? (isBoss(actor) ? inferredArtistId : actor.id);

      return tx.contact.update({
        where: { id: contactId },
        data: { status: 'CONVERTED', ownerArtistId: nextOwnerArtistId },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
            },
          },
          ownerArtist: {
            select: {
              id: true,
              name: true,
              phone: true,
              branchId: true,
              branch: { select: { id: true, name: true } },
            },
          },
        },
      });
    });
  }
}
