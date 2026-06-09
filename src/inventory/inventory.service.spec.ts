import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Product } from './entities/product.entity';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Product],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Product]),
      ],
      providers: [InventoryService],
    }).compile();

    service = moduleRef.get<InventoryService>(InventoryService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await moduleRef.get(DataSource).destroy();
  });

  it('seeds the catalog on init', async () => {
    expect(await service.getStock('prod_abc123')).toBe(100);
    expect(await service.getStock('prod_def456')).toBe(50);
  });

  it('reserves stock when available', async () => {
    await expect(service.checkAndReserve('prod_abc123', 2)).resolves.toBe(true);
    expect(await service.getStock('prod_abc123')).toBe(98);
  });

  it('throws when the product is unknown', async () => {
    await expect(service.checkAndReserve('nope', 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when stock is insufficient and leaves stock untouched', async () => {
    await expect(
      service.checkAndReserve('prod_ghi789', 1000),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await service.getStock('prod_ghi789')).toBe(25);
  });

  it('releases stock back to the catalog', async () => {
    await service.checkAndReserve('prod_def456', 10);
    await service.release('prod_def456', 10);
    expect(await service.getStock('prod_def456')).toBe(50);
  });

  it('does not oversell under concurrent reservations', async () => {
    const attempts = Array.from({ length: 30 }, () =>
      service.checkAndReserve('prod_ghi789', 1).catch(() => false),
    );
    await Promise.all(attempts);
    // Started with 25 units; can never go negative.
    expect(await service.getStock('prod_ghi789')).toBe(0);
  });
});
