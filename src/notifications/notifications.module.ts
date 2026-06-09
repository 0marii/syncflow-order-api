import { Module } from '@nestjs/common';
import { NOTIFICATION_SERVICE } from './notification.interface';
import { NotificationService } from './notifications.service';

@Module({
  providers: [
    NotificationService,
    { provide: NOTIFICATION_SERVICE, useExisting: NotificationService },
  ],
  exports: [NOTIFICATION_SERVICE],
})
export class NotificationsModule {}
