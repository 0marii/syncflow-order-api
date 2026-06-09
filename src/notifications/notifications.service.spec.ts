import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notifications.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let logSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs a confirmation message', async () => {
    await service.sendConfirmation('user_xyz789', 'ord_001');

    expect(logSpy).toHaveBeenCalledWith(
      'Order confirmation sent to user user_xyz789 for order ord_001',
    );
  });
});
