import { OrderStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsPositive, IsUUID, isEnum, isUUID } from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';

export class ChangeOrderStatusDto {
  
  @IsUUID(4)
  id: string;

  @IsEnum(OrderStatusList, {
    message: `Status must be one of these: ${OrderStatusList}`,
  })
  status: OrderStatus;
}
