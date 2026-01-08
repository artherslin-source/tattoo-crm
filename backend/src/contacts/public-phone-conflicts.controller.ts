import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhoneDigits } from '../common/utils/phone';

@Controller('public')
export class PublicPhoneConflictsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('phone-conflicts')
  async check(@Query('phone') phoneRaw?: string) {
    const normalizedPhone = normalizePhoneDigits(phoneRaw);
    if (!normalizedPhone) {
      return {
        normalizedPhone: null,
        userExists: false,
        contactExists: false,
        messageCode: 'INVALID',
        message: '手機格式不正確（需 10~15 位數字）',
      };
    }

    const [user, contact] = await Promise.all([
      this.prisma.user.findUnique({ where: { phone: normalizedPhone }, select: { id: true } }),
      this.prisma.contact.findFirst({ where: { phone: normalizedPhone }, select: { id: true } }),
    ]);

    const userExists = !!user;
    const contactExists = !!contact;

    let messageCode: string = 'OK';
    let message: string = '';
    if (userExists) {
      messageCode = 'USER_EXISTS';
      message = '此手機已註冊，建議先登入，方便追蹤與查詢。';
    } else if (contactExists) {
      messageCode = 'CONTACT_EXISTS';
      message = '此手機已有聯絡紀錄，本次需求會併入同一筆聯絡。';
    }

    return { normalizedPhone, userExists, contactExists, messageCode, message };
  }
}


