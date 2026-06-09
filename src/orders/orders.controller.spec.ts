import { Test, TestingModule } from '@nestjs/testing';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;

  const mockOrder: Order = {
    id: 'ord_001',
    productId: 'prod_abc123',
    quantity: 2,
    userId: 'user_xyz789',
    status: 'CONFIRMED',
    createdAt: new Date('2026-01-15T10:30:00.000Z'),
  };

  const mockOrdersService = {
    create: jest.fn().mockResolvedValue(mockOrder),
    findAll: jest.fn().mockResolvedValue([mockOrder]),
    findOne: jest.fn().mockResolvedValue(mockOrder),
    update: jest.fn().mockResolvedValue({ ...mockOrder, quantity: 5 }),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('creates an order', async () => {
    const dto: CreateOrderDto = {
      productId: 'prod_abc123',
      quantity: 2,
      userId: 'user_xyz789',
    };

    expect(await controller.create(dto)).toEqual(mockOrder);
    expect(mockOrdersService.create).toHaveBeenCalledWith(dto);
  });

  it('returns all orders', async () => {
    expect(await controller.findAll()).toEqual([mockOrder]);
    expect(mockOrdersService.findAll).toHaveBeenCalled();
  });

  it('returns one order', async () => {
    expect(await controller.findOne('ord_001')).toEqual(mockOrder);
    expect(mockOrdersService.findOne).toHaveBeenCalledWith('ord_001');
  });

  it('updates an order', async () => {
    const result = await controller.update('ord_001', { quantity: 5 });
    expect(result.quantity).toBe(5);
    expect(mockOrdersService.update).toHaveBeenCalledWith('ord_001', {
      quantity: 5,
    });
  });

  it('removes an order', async () => {
    await controller.remove('ord_001');
    expect(mockOrdersService.remove).toHaveBeenCalledWith('ord_001');
  });
});
