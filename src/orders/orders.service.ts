import { HttpStatus, Injectable, Logger, OnModuleInit, ParseUUIDPipe } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrdersService');
  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }
  create(createOrderDto: CreateOrderDto) {
    return this.order.create({
      data: createOrderDto,
    });
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const {limit, page} = orderPaginationDto;
    const totalPages = await this.order.count({
      where: {
        status: orderPaginationDto.status,
      },
    });
    const lastPage = Math.ceil(totalPages / limit);


    return{ 
      data : await this.order.findMany({
        take: limit,
        skip: (page - 1) * limit,
        where: { status: orderPaginationDto.status },
      }),
      meta: {
        total: totalPages,
        page,
        lastPage,
      }
    }
  }

  async findOne(id: string) {
    const order = await this.order.findUnique({
      where: { id }
    });
    if (!order) {
      throw new RpcException({status: HttpStatus.NOT_FOUND, message: `Order with id ${id} not found`});   
     }
    return order;
  }

}
