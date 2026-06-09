import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 'prod_abc123', description: 'Product to order' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 2, minimum: 1, description: 'Units to order' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'user_xyz789', description: 'Ordering user' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
