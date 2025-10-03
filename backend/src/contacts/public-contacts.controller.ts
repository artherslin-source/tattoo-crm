import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { ContactsService } from './contacts.service';

const CreatePublicContactSchema = z.object({
  name: z.string().min(1, '姓名為必填欄位'),
  email: z.string().email('請輸入有效的電子郵件地址'),
  phone: z.string().optional(),
  branchId: z.string().min(1, '請選擇分店'),
  notes: z.string().optional(),
});

@Controller('public/contacts')
export class PublicContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  async createPublic(@Body() body: unknown) {
    const input = CreatePublicContactSchema.parse(body);
    
    return this.contactsService.create(input);
  }
}
