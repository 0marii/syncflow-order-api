import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Product } from './entities/product.entity';

const SEED_PRODUCTS: ReadonlyArray<Product> = [
  { id: 'prod_abc123', stock: 100 },
  { id: 'prod_def456', stock: 50 },
  { id: 'prod_ghi789', stock: 25 },
];

@Injectable()
export class InventoryService implements OnModuleInit {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const product of SEED_PRODUCTS) {
      const exists = await this.productRepo.findOne({
        where: { id: product.id },
      });
      if (!exists) {
        await this.productRepo.save(product);
      }
    }
  }

  /**
   * Atomically reserves stock using a single conditional UPDATE.
   * The `stock >= quantity` guard lives inside the WHERE clause, so the
   * read-and-decrement happens as one indivisible operation. This prevents
   * the race condition where two concurrent orders both pass a separate
   * "check" and then oversell the same units.
   */
  async checkAndReserve(
    productId: string,
    quantity: number,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repo = this.repo(manager);

    const result = await repo
      .createQueryBuilder()
      .update(Product)
      .set({ stock: () => `stock - ${quantity}` })
      .where('id = :productId AND stock >= :quantity', { productId, quantity })
      .execute();

    if (!result.affected) {
      const product = await repo.findOne({ where: { id: productId } });
      if (!product) {
        throw new BadRequestException(`Product ${productId} not found`);
      }
      throw new BadRequestException(
        `Insufficient stock for product ${productId}. Available: ${product.stock}, requested: ${quantity}`,
      );
    }

    return true;
  }

  async release(
    productId: string,
    quantity: number,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager)
      .createQueryBuilder()
      .update(Product)
      .set({ stock: () => `stock + ${quantity}` })
      .where('id = :productId', { productId })
      .execute();
  }

  async getStock(productId: string): Promise<number | undefined> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    return product?.stock;
  }

  private repo(manager?: EntityManager): Repository<Product> {
    return manager ? manager.getRepository(Product) : this.productRepo;
  }
}
