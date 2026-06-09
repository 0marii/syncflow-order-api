import { Injectable, Logger } from '@nestjs/common';
import { INotificationService } from './notification.interface';

@Injectable()
export class NotificationService implements INotificationService {
  private readonly logger = new Logger(NotificationService.name);

  sendConfirmation(userId: string, orderId: string): Promise<void> {
    this.logger.log(
      `Order confirmation sent to user ${userId} for order ${orderId}`,
    );
    return Promise.resolve();
  }
}
