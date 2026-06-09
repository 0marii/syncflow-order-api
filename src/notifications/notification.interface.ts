export const NOTIFICATION_SERVICE = Symbol('NOTIFICATION_SERVICE');

/**
 * Provider-agnostic contract for outbound user notifications.
 * The Orders layer depends only on this interface, so the underlying
 * channel (Console -> Email -> SMS -> Push) can be swapped by binding a
 * different implementation to the NOTIFICATION_SERVICE token, without
 * touching any business logic.
 */
export interface INotificationService {
  sendConfirmation(userId: string, orderId: string): Promise<void>;
}
