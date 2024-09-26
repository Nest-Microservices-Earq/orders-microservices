import { HttpStatus, Inject, Injectable, Logger, OnModuleInit, ParseUUIDPipe } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { NATS_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy)
  {
    super();
  }

  private readonly logger = new Logger('OrdersService');
  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }
  async create(createOrderDto: CreateOrderDto) {

    try{
      const products: any[] = await firstValueFrom(this.client.send({ cmd: 'validate_product' }, createOrderDto.items.map(item => item.productId)));

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find((product) => product.id === orderItem.productId).price;
        return price * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                  price: products.find((product) => product.id === orderItem.productId).price,
                  productId: orderItem.productId,
                  quantity: orderItem.quantity
                }))
            }
          }
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
          }
        }
      }
      });
       
      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({ 
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId).name,
        })),

      }
    }catch(error) {
      throw new RpcException({status: HttpStatus.BAD_REQUEST, message: error.message});
    }
  
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
    const order = await this.order.findFirst({
      where: { id },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          }
        }
      }
    });
    if (!order) {
      throw new RpcException({status: HttpStatus.NOT_FOUND, message: `Order with id ${id} not found`});   
     }

     const productIds = order.OrderItem.map((orderItem) => orderItem.productId);
     const products : any[] = await firstValueFrom(this.client.send({ cmd: 'validate_product' }, productIds));
     return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({ 
        ...orderItem,
        name: products.find((product) => product.id === orderItem.productId).name,
      })),
     }
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.order.findFirst({
      where: { id }
    });
    if(order.status === status) {
      return order;
    }
    if (!order) {
      throw new RpcException({status: HttpStatus.NOT_FOUND, message: `Order with id ${id} not found`});   
     }
    return await this.order.update({
      where: { id },
      data: {
        status
      },
    });
  }
}
