import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Product } from '../inventory/entities/product.entity';
import { InventoryService } from '../inventory/inventory.service';
import { NOTIFICATION_SERVICE } from '../notifications/notification.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let inventory: InventoryService;
  let moduleRef: TestingModule;

  const mockNotification = { sendConfirmation: jest.fn() };

  const dto: CreateOrderDto = {
    productId: 'prod_abc123',
    quantity: 2,
    userId: 'user_xyz789',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockNotification.sendConfirmation.mockResolvedValue(undefined);

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Order, Product],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Order, Product]),
      ],
      providers: [
        OrdersService,
        InventoryService,
        { provide: NOTIFICATION_SERVICE, useValue: mockNotification },
      ],
    }).compile();

    service = moduleRef.get<OrdersService>(OrdersService);
    inventory = moduleRef.get<InventoryService>(InventoryService);
    await inventory.onModuleInit();
  });

  afterEach(async () => {
    await moduleRef.get(DataSource).destroy();
  });

  it('creates an order, reserves stock and notifies the user', async () => {
    const order = await service.create(dto);

    expect(order.id).toBeDefined();
    expect(order.status).toBe('CONFIRMED');
    expect(await inventory.getStock('prod_abc123')).toBe(98);
    expect(mockNotification.sendConfirmation).toHaveBeenCalledWith(
      'user_xyz789',
      order.id,
    );
  });

  it('does not reserve stock when the order cannot be placed', async () => {
    await expect(
      service.create({ ...dto, productId: 'unknown' }),
    ).rejects.toBeInstanceOf(Error);
    expect(mockNotification.sendConfirmation).not.toHaveBeenCalled();
  });

  it('still returns the order when notification delivery fails', async () => {
    mockNotification.sendConfirmation.mockRejectedValueOnce(
      new Error('SMTP down'),
    );
    const order = await service.create(dto);
    expect(order.status).toBe('CONFIRMED');
  });

  it('returns all orders', async () => {
    await service.create(dto);
    expect(await service.findAll()).toHaveLength(1);
  });

  it('returns one order by id', async () => {
    const created = await service.create(dto);
    expect((await service.findOne(created.id)).id).toBe(created.id);
  });

  it('throws when an order is not found', async () => {
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('re-reserves stock when quantity is updated', async () => {
    const created = await service.create(dto);
    await service.update(created.id, { quantity: 5 });

    // released 2, reserved 5 => 100 - 5 = 95
    expect(await inventory.getStock('prod_abc123')).toBe(95);
  });

  it('rolls back when an update cannot reserve new stock', async () => {
    const created = await service.create(dto);
    await expect(
      service.update(created.id, { quantity: 10_000 }),
    ).rejects.toBeInstanceOf(Error);

    // Original reservation must be intact: 100 - 2 = 98
    expect(await inventory.getStock('prod_abc123')).toBe(98);
    expect((await service.findOne(created.id)).quantity).toBe(2);
  });

  it('releases stock when an order is deleted', async () => {
    const created = await service.create(dto);
    await service.remove(created.id);

    expect(await inventory.getStock('prod_abc123')).toBe(100);
    await expect(service.findOne(created.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
