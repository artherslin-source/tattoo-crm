import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { isBoss, type AccessActor } from '../common/access/access.types';
import { NotificationsService } from '../notifications/notifications.service';
import { formatContactMergeNote, normalizePhoneDigits } from '../common/utils/phone';
import { resolveArtistScope } from '../common/access/artist-scope';

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async notifyOwnerAssigned(input: {
    contactId: string;
    contactName: string;
    contactPhone?: string | null;
    contactEmail?: string | null;
    branchId?: string | null;
    newOwnerArtistId: string;
  }) {
    const dedupKey = `contact-assigned:${input.contactId}:${input.newOwnerArtistId}`;
    const displayContact = input.contactPhone || input.contactEmail || input.contactId;
    await this.notifications.createForUser({
      userId: input.newOwnerArtistId,
      type: 'SYSTEM',
      title: '聯絡指派',
      message: `你被指派新的聯絡：${input.contactName}（${displayContact}）`,
      dedupKey,
      data: {
        kind: 'CONTACT_ASSIGNED',
        contactId: input.contactId,
        contactName: input.contactName,
        phone: input.contactPhone ?? undefined,
        email: input.contactEmail ?? undefined,
        branchId: input.branchId ?? undefined,
      },
    });
  }

  async createPublic(createContactDto: CreateContactDto) {
    // Public endpoint: allow creating a lead/contact with optional owner assignment (user-selected artist).
    const safeDto: CreateContactDto = {
      name: createContactDto.name,
      email: createContactDto.email,
      phone: createContactDto.phone,
      branchId: createContactDto.branchId,
      notes: createContactDto.notes,
      ownerArtistId: createContactDto.ownerArtistId,
    };

    const normalizedPhone = normalizePhoneDigits(safeDto.phone ?? undefined);
    if (normalizedPhone) safeDto.phone = normalizedPhone;

    // If ownerArtistId is provided, validate role + lock branch to that artist's branch (if available).
    if (safeDto.ownerArtistId) {
      const owner = await this.prisma.user.findUnique({
        where: { id: safeDto.ownerArtistId },
        select: { id: true, role: true, branchId: true },
      });
      if (!owner) throw new Error('指定的刺青師不存在');
      if (String(owner.role || '').toUpperCase() !== 'ARTIST') {
        throw new Error('ownerArtistId 必須是 ARTIST');
      }
      if (owner.branchId) {
        safeDto.branchId = owner.branchId;
      }
    }

    // Validate branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: safeDto.branchId },
      select: { id: true },
    });
    if (!branch) {
      throw new Error('指定的分店不存在');
    }

    // Merge rule (global phone unique): if phone exists, update the existing contact instead of creating a new one.
    if (normalizedPhone) {
      const existing = await this.prisma.contact.findFirst({
        where: { phone: normalizedPhone },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          branchId: true,
          ownerArtistId: true,
          notes: true,
        },
      });

      const mergeNote = formatContactMergeNote({
        source: 'public',
        normalizedPhone,
        submittedName: safeDto.name ?? null,
        submittedEmail: safeDto.email ?? null,
        submittedBranchId: safeDto.branchId ?? null,
        submittedOwnerArtistId: safeDto.ownerArtistId ?? null,
        submittedNotes: safeDto.notes ?? null,
      });

      if (existing) {
        const nextNotes = [existing.notes?.trim(), mergeNote].filter(Boolean).join('\n\n');
        const nextOwnerArtistId = existing.ownerArtistId
          ? existing.ownerArtistId
          : (safeDto.ownerArtistId ?? null);

        // Only fill blanks; do not overwrite existing branchId/name/email/ownerArtistId.
        const updated = await this.prisma.contact.update({
          where: { id: existing.id },
          data: {
            notes: nextNotes,
            ...(existing.name ? {} : { name: safeDto.name }),
            ...(existing.email ? {} : { email: safeDto.email }),
            ...(existing.ownerArtistId ? {} : { ownerArtistId: nextOwnerArtistId }),
            // branchId is global-unique contact; do not override. (We record submittedBranchId in notes.)
          },
          include: {
            branch: { select: { id: true, name: true, address: true, phone: true } },
          },
        });

        if (!existing.ownerArtistId && updated.ownerArtistId) {
          await this.notifyOwnerAssigned({
            contactId: updated.id,
            contactName: updated.name,
            contactPhone: updated.phone ?? null,
            contactEmail: updated.email ?? null,
            branchId: updated.branchId ?? null,
            newOwnerArtistId: updated.ownerArtistId,
          });
        }

        return updated;
      }
    }

    const created = await this.prisma.contact.create({
      data: safeDto,
      include: {
        branch: { select: { id: true, name: true, address: true, phone: true } },
      },
    });

    if (created.ownerArtistId) {
      await this.notifyOwnerAssigned({
        contactId: created.id,
        contactName: created.name,
        contactPhone: created.phone ?? null,
        contactEmail: created.email ?? null,
        branchId: created.branchId ?? null,
        newOwnerArtistId: created.ownerArtistId,
      });
    }

    return created;
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

  private async getAccessibleBranchIdsForArtist(actor: AccessActor): Promise<string[]> {
    const ids = new Set<string>();
    if (actor.branchId) ids.add(actor.branchId);
    const extra = await this.prisma.artistBranchAccess.findMany({
      where: { userId: actor.id },
      select: { branchId: true },
    });
    for (const r of extra) ids.add(r.branchId);
    return Array.from(ids);
  }

  private async normalizeBranchFilter(actor: AccessActor, input?: { branchId?: string }) {
    const raw = (input?.branchId || '').trim();
    const branchId = raw && raw !== 'all' ? raw : null;
    if (isBoss(actor)) return { branchId, accessibleBranchIds: null as string[] | null };
    const accessibleBranchIds = await this.getAccessibleBranchIdsForArtist(actor);
    if (branchId && !accessibleBranchIds.includes(branchId)) {
      throw new ForbiddenException('Insufficient permissions for selected branch');
    }
    return { branchId, accessibleBranchIds };
  }

  async create(actor: AccessActor, createContactDto: CreateContactDto) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can create contacts');
    try {
      const normalizedPhone = normalizePhoneDigits(createContactDto.phone ?? undefined);
      const dto: CreateContactDto = {
        ...createContactDto,
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      };

      // 驗證分店是否存在
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId }
      });
      
      if (!branch) {
        throw new Error('指定的分店不存在');
      }

      if (dto.ownerArtistId) {
        const owner = await this.prisma.user.findUnique({
          where: { id: dto.ownerArtistId },
          select: { id: true, role: true },
        });
        if (!owner) throw new Error('指定的刺青師不存在');
        if (String(owner.role || '').toUpperCase() !== 'ARTIST') {
          throw new Error('ownerArtistId 必須是 ARTIST');
        }
      }

      // Merge rule (global phone unique) for admin create as well.
      if (normalizedPhone) {
        const existing = await this.prisma.contact.findFirst({
          where: { phone: normalizedPhone },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            branchId: true,
            ownerArtistId: true,
            notes: true,
          },
        });

        const mergeNote = formatContactMergeNote({
          source: 'admin',
          normalizedPhone,
          submittedName: dto.name ?? null,
          submittedEmail: dto.email ?? null,
          submittedBranchId: dto.branchId ?? null,
          submittedOwnerArtistId: dto.ownerArtistId ?? null,
          submittedNotes: dto.notes ?? null,
        });

        if (existing) {
          const nextNotes = [existing.notes?.trim(), mergeNote].filter(Boolean).join('\n\n');
          const nextOwnerArtistId = existing.ownerArtistId ? existing.ownerArtistId : (dto.ownerArtistId ?? null);

          const updated = await this.prisma.contact.update({
            where: { id: existing.id },
            data: {
              notes: nextNotes,
              ...(existing.name ? {} : { name: dto.name }),
              ...(existing.email ? {} : { email: dto.email }),
              ...(existing.ownerArtistId ? {} : { ownerArtistId: nextOwnerArtistId }),
            },
            include: {
              branch: { select: { id: true, name: true, address: true, phone: true } },
            },
          });

          if (!existing.ownerArtistId && updated.ownerArtistId) {
            await this.notifyOwnerAssigned({
              contactId: updated.id,
              contactName: updated.name,
              contactPhone: updated.phone ?? null,
              contactEmail: updated.email ?? null,
              branchId: updated.branchId ?? null,
              newOwnerArtistId: updated.ownerArtistId,
            });
          }

          return updated;
        }
      }
      
      const created = await this.prisma.contact.create({
        data: dto,
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

      if (created.ownerArtistId) {
        await this.notifyOwnerAssigned({
          contactId: created.id,
          contactName: created.name,
          contactPhone: created.phone ?? null,
          contactEmail: created.email ?? null,
          branchId: created.branchId ?? null,
          newOwnerArtistId: created.ownerArtistId,
        });
      }

      return created;
    } catch (error) {
      console.error('ContactsService.create error:', error);
      throw error;
    }
  }

  async findAll(actor: AccessActor, input?: { branchId?: string }) {
    const { selectedBranchId, allArtistUserIds, accessibleBranchIds } = await resolveArtistScope(
      this.prisma,
      actor,
      input?.branchId,
    );
    const scope = isBoss(actor)
      ? {}
      : {
          OR: [
            { ownerArtistId: { in: allArtistUserIds } as any },
            { appointments: { some: { artistId: { in: allArtistUserIds } as any } } },
          ],
        };
    const where =
      isBoss(actor)
        ? selectedBranchId
          ? { branchId: selectedBranchId }
          : {}
        : {
            AND: [
              scope,
              { branchId: { in: accessibleBranchIds! } },
              ...(selectedBranchId ? [{ branchId: selectedBranchId }] : []),
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

    const before =
      isBoss(actor) && (data as any).ownerArtistId !== undefined
        ? await this.prisma.contact.findUnique({
            where: { id },
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              branchId: true,
              ownerArtistId: true,
            },
          })
        : null;

    const updated = await this.prisma.contact.update({
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

    // Only BOSS can assign; generate notification when assignment changes to a new non-null owner.
    if (before && before.ownerArtistId !== updated.ownerArtistId && updated.ownerArtistId) {
      await this.notifyOwnerAssigned({
        contactId: updated.id,
        contactName: updated.name,
        contactPhone: (updated as any).phone ?? before.phone ?? null,
        contactEmail: (updated as any).email ?? before.email ?? null,
        branchId: (updated as any).branchId ?? before.branchId ?? null,
        newOwnerArtistId: updated.ownerArtistId,
      });
    }

    return updated;
  }

  async remove(actor: AccessActor, id: string) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can delete contacts');
    return this.prisma.contact.delete({
      where: { id },
    });
  }

  async getStats(actor: AccessActor, input?: { branchId?: string }) {
    const { selectedBranchId, allArtistUserIds, accessibleBranchIds } = await resolveArtistScope(
      this.prisma,
      actor,
      input?.branchId,
    );
    const scope = isBoss(actor)
      ? {}
      : {
          OR: [
            { ownerArtistId: { in: allArtistUserIds } as any },
            { appointments: { some: { artistId: { in: allArtistUserIds } as any } } },
          ],
        };
    const where =
      isBoss(actor)
        ? selectedBranchId
          ? { branchId: selectedBranchId }
          : {}
        : {
            AND: [
              scope,
              { branchId: { in: accessibleBranchIds! } },
              ...(selectedBranchId ? [{ branchId: selectedBranchId }] : []),
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
