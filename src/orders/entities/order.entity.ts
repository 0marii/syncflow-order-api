import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type OrderStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';

@Entity('orders')
export class Order {
  @ApiProperty({ example: 'ord_001', description: 'Unique order identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'prod_abc123' })
  @Column()
  productId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Column('integer')
  quantity: number;

  @ApiProperty({ example: 'user_xyz789' })
  @Column()
  userId: string;

  @ApiProperty({
    example: 'CONFIRMED',
    enum: ['CONFIRMED', 'PENDING', 'CANCELLED'],
  })
  @Column({ default: 'CONFIRMED' })
  status: OrderStatus;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;
}
