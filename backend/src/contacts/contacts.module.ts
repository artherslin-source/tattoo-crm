import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { PublicContactsController } from './public-contacts.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ContactsController, PublicContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
