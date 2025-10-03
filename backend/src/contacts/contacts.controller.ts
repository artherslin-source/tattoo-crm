import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('contacts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Roles('BOSS', 'BRANCH_MANAGER')
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactsService.create(createContactDto);
  }

  @Get()
  @Roles('BOSS', 'BRANCH_MANAGER')
  findAll(@Req() req: any) {
    // 如果是分店經理，只顯示該分店的聯絡表單
    if (req.user.role === 'BRANCH_MANAGER' && req.user.branchId) {
      return this.contactsService.findByBranch(req.user.branchId);
    }
    // 老闆可以看到所有聯絡表單
    return this.contactsService.findAll();
  }

  @Get('stats')
  @Roles('BOSS', 'BRANCH_MANAGER')
  getStats() {
    return this.contactsService.getStats();
  }

  @Get(':id')
  @Roles('BOSS', 'BRANCH_MANAGER')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(':id')
  @Roles('BOSS', 'BRANCH_MANAGER')
  update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    return this.contactsService.update(id, updateContactDto);
  }

  @Delete(':id')
  @Roles('BOSS')
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
