import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';

@Controller('admin/contacts')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@Actor() actor: AccessActor, @Body() createContactDto: CreateContactDto) {
    return this.contactsService.create(actor, createContactDto);
  }

  @Get()
  findAll(@Actor() actor: AccessActor, @Query('branchId') branchId?: string) {
    return this.contactsService.findAll(actor, { branchId });
  }

  @Get('stats')
  getStats(@Actor() actor: AccessActor, @Query('branchId') branchId?: string) {
    return this.contactsService.getStats(actor, { branchId });
  }

  @Get(':id')
  findOne(@Actor() actor: AccessActor, @Param('id') id: string) {
    return this.contactsService.findOne(actor, id);
  }

  @Patch(':id')
  update(@Actor() actor: AccessActor, @Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    return this.contactsService.update(actor, id, updateContactDto);
  }

  @Post(':id/convert')
  convertToAppointment(@Actor() actor: AccessActor, @Param('id') id: string) {
    return this.contactsService.convertToAppointment(actor, id);
  }

  @Delete(':id')
  remove(@Actor() actor: AccessActor, @Param('id') id: string) {
    return this.contactsService.remove(actor, id);
  }
}
