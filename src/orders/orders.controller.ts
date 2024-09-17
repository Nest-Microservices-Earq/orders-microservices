import { Controller, NotImplementedException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern({ cmd: 'create_order' })
  create(@Payload() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @MessagePattern({ cmd: 'find_all_orders' })
  findAll() {
    return this.ordersService.findAll();
  }

  @MessagePattern({ cmd: 'find_one_order' })
  findOne(@Payload() id: number) {
    return this.ordersService.findOne(+id);
  }


  @MessagePattern('changeOrderStatus')
  changeOrderStatus(@Payload() id: number) {
    // return this.ordersService.changeOrderStatus(id);
    throw new NotImplementedException();
  }
}
