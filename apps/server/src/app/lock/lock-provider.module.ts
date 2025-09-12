import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LockProviderRegistry } from './core/lock.registry';
import { WebhookProvider } from './providers/webhook.provider';
import { DbProvider } from './providers/db.provider';
//import { RabbitMqProvider } from './providers/rabbitmq.provider';
// import { connect, Connection } from 'amqplib';

@Module({
  imports: [HttpModule],
  providers: [
    LockProviderRegistry,
    WebhookProvider,
    DbProvider,
    // RabbitMqProvider,
    // {
    //   provide: 'AMQP_CONNECTION',
    //   useFactory: async (): Promise<Connection> => {
    //     const url = process.env.AMQP_URL || 'amqp://localhost';
    //     return connect(url);
    //   },
    // },
  ],
  exports: [LockProviderRegistry],
})
export class LockProviderModule {}
