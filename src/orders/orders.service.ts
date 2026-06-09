import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryService } from '../inventory/inventory.service';
import { NOTIFICATION_SERVICE } from '../notifications/notification.interface';
import type { INotificationService } from '../notifications/notification.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: INotificationService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const order = await this.dataSource.transaction(async (manager) => {
      await this.inventoryService.checkAndReserve(
        createOrderDto.productId,
        createOrderDto.quantity,
        manager,
      );

      const entity = manager.getRepository(Order).create({
        ...createOrderDto,
        status: 'CONFIRMED',
      });
      return manager.getRepository(Order).save(entity);
    });

    await this.notify(order.userId, order.id);
    return order;
  }

  findAll(): Promise<Order[]> {
    return this.orderRepo.find();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }

  /**
   * Updates an order while keeping inventory consistent. If the product or
   * quantity changes, the previous reservation is released and the new one
   * is reserved inside a single transaction, so a failed re-reservation
   * rolls back cleanly and never leaves stock double-counted or leaked.
   */
  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Order);
      const order = await repo.findOne({ where: { id } });
      if (!order) {
        throw new NotFoundException(`Order ${id} not found`);
      }

      const nextProductId = updateOrderDto.productId ?? order.productId;
      const nextQuantity = updateOrderDto.quantity ?? order.quantity;
      const inventoryChanged =
        nextProductId !== order.productId || nextQuantity !== order.quantity;

      if (inventoryChanged) {
        await this.inventoryService.release(
          order.productId,
          order.quantity,
          manager,
        );
        await this.inventoryService.checkAndReserve(
          nextProductId,
          nextQuantity,
          manager,
        );
      }

      Object.assign(order, updateOrderDto);
      return repo.save(order);
    });
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Order);
      const order = await repo.findOne({ where: { id } });
      if (!order) {
        throw new NotFoundException(`Order ${id} not found`);
      }
      await this.inventoryService.release(
        order.productId,
        order.quantity,
        manager,
      );
      await repo.remove(order);
    });
  }

  /**
   * Notifications are a side effect, not part of the order transaction.
   * A delivery failure must not roll back a successfully placed order, so
   * we isolate and log it rather than propagating it to the caller.
   */
  private async notify(userId: string, orderId: string): Promise<void> {
    try {
      await this.notificationService.sendConfirmation(userId, orderId);
    } catch (error) {
      this.logger.error(
        `Failed to send confirmation for order ${orderId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
