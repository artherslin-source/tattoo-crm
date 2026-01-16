import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { PublicContactsController } from './public-contacts.controller';
import { PublicPhoneConflictsController } from './public-phone-conflicts.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, NotificationsModule, AuditModule],
  controllers: [ContactsController, PublicContactsController, PublicPhoneConflictsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
