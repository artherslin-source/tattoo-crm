import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AppointmentReminderWorker } from './appointment-reminder.worker';

@Module({
  providers: [NotificationsService, AppointmentReminderWorker],
  exports: [NotificationsService],
})
export class NotificationsModule {}


